using YAML, Dates
bibliography = YAML.load_file("data/bibliography.yaml")
literature = merge(YAML.load_file("data/literature.yaml"), bibliography)


# Below is WIP to try and parse the bibiolgraphy entries directly from a bib file.
# The idea is to write them into dictionaries, to match what YAML does.
using Bibliography
using BibInternal # not sure I need these
using BibParser # not sure I need these
using Bibliography: names_to_strings
# bibliography2 = import_bibtex("data/mypapers.bib")

# TODO not sure I need this
"""
Pretty print nested dictionaries
"""
function pretty_print2(d, pre=1)
    todo = Vector{Tuple}()
    for (k,v) in d
        if typeof(v) <: Dict
            push!(todo, (k,v))
        else
            println(join(fill(" ", pre)) * "$(repr(k)) => $(repr(v))")
        end
    end

    for (k,d) in todo
        s = "$(repr(k)) => "
        println(join(fill(" ", pre)) * s)
        pretty_print2(d, pre+1+length(s))
    end
    nothing
end

"""
convert bibentry from Bibliography.jl to a dictionary
"""
function bibentry2dict(bibentry)
    d = Dict()
    fields = propertynames(bibentry)
    for f in fields
        f ∈ ["fields"] && continue
        v = string(getproperty(bibentry, f))
        println("$f => $v")
        d[f] = v
    end
    if haskey(bibentry, "fields")
        for (f,v) in bibentry.fields
            v = string(getproperty(bibentry, f))
            println("$f => $v")
            d[f] = v
        end
    end
    return d
end
function bibentry2dict2(bibentry)
    d = Dict{String, String}()
    addbibentrysubfieldtodict!(d, bibentry, :access, :doi, "doi")
    hasproperty(bibentry, :access) && (d["doi"] = bibentry.access.doi)
    hasproperty(bibentry, :authors) && (d["author"] = names_to_strings(bibentry.authors))
    hasproperty(bibentry, :editors) && (d["editor"] = names_to_strings(bibentry.editors))
    hasproperty(bibentry, :title) && (d["title"] = bibentry.title)
    hasproperty(bibentry, :booktile) && (d["booktitle"] = bibentry.booktitle)
    hasproperty(bibentry, :date) && (addbibentryfieldtodict!(d, bibentry.date))
    hasproperty(bibentry, :in) && (addbibentryfieldtodict!(d, bibentry.in))
    # hasproperty(bibentry, :eprint) && (d["eprint"] = bibentry.eprint)
    hasproperty(bibentry, :type) && (d["biblatextype"] = bibentry.type)
    hasproperty(bibentry, :id) && (d["id"] = bibentry.id)
    hasproperty(bibentry, :fields) && (addbibentrysubfieldstodict!(d, bibentry.fields))
    return d
end
function addbibentryfieldtodict!(d, bibentry, field, fieldname)
    if hasproperty(bibentry, field)
        v = getproperty(bibentry, field)
        !isempty(v) && (d[fieldname] = v)
    end
end
function addbibentrysubfieldtodict!(d, bibentry, field, subfield, fieldname)
    if hasproperty(bibentry, field)
        v = getproperty(getproperty(bibentry, field), subfield)
        !isempty(v) && (d[fieldname] = v)
    end
end
function addbibentrysubfieldstodict!(d, bibentryfield)
    for k in propertynames(bibentryfield)
        k ∈ (:vals, :keys, :age, :maxprobe, :slots, :ndel, :count, :idxfloor) && continue
        v = getproperty(bibentryfield, k)
        !isempty(v) && (d[string(k)] = v)
    end
    return d
end

# @show pretty_print2(bibliography["Pasquier_Holzer_JGRO_2016"])
# @show bibliography2["a:2016:1"]
# @show pretty_print2(bibliography2["a:2016:1"])

#
#
# Cite fun
#
#
"""
"""
function hfun_cite(params)
    s = "";
    for citekey in params
        if !haskey(literature, citekey)
            s = return """<span class="error">key $citekey not found in library.</span>"""
        else
        s = "$(s)$(append_citekey(citekey))"
        end
    end
    return s
end
function hfun_nocite(params)
    s = "";
    for citekey in params
        if !haskey(literature, citekey)
            s = """$s<span class="error">key $citekey not found in library.</span>"""
        else
            append_citekey(citekey)
        end
    end
    return s
end
function append_citekey(citekey)
    if isnothing(locvar("cite_keys"))
        Franklin.LOCAL_VARS["cite_keys"] = Franklin.dpair([citekey])
    else
        cite_keys = Franklin.locvar("cite_keys")
        push!(cite_keys,citekey)
        Franklin.set_var!(Franklin.LOCAL_VARS, "cite_keys", cite_keys)
    end
    return """<span class="cite"><a href="#$(citekey)">$(citekey)</a></span>"""
end
"""
    {{references}}

print the references used in this page, where the first parameter can be set to "alphabet"
to order the references alphabetically (poor-mans way by key name). Otherwise their occurence
is used as order.
"""
hfun_references() = hfun_references([])
function hfun_references(params)
    sortby = "occurence"
    if length(params) > 0
        sortby = params[1]
    end
    list_literature = ""
    isnothing(locvar("cite_keys")) && return "A"
    unique_keys = unique(locvar("cite_keys"))
    (sortby=="alphabet") && (unique_keys = sort(unique_keys))
    for key in unique_keys
        list_literature = """$list_literature
            $(format_bibtex_entry(literature[key],key; list_style="key"))
        """
    end
    return """<h2>References</h2>
              <ol class="literature">
              $list_literature
              </ol>
           """
end
getdate(a) = parse(Date, string( get(a, "publication_date", a["year"]) ))
getexpecteddate(a) = parse(Date, string( a["expecteddate"] ))
gettitle(a) = a["title"]
"""
    isless_bibtex(a,b)

"""
function isless_bibtex(a::Dict,b::Dict)
    # #load either publication date or year
    # date_a = parse(Date, string( get(a, "publication_date", a["year"]) ))
    # date_b = parse(Date, string( get(b, "publication_date", b["year"]) ))
    # if date_a == date_b
    #     # if same day (or year) sort by title
    #     return isless(a["title"], b["title"])
    # else
    #     # order by reverse date, i.e. newest years top
    #     return !(isless(date_a,date_b))
    # end
    #load either publication date or year
    date_a, date_b = try
        getdate(a), getdate(b)
    catch foo
        try
            getexpecteddate(a), getexpecteddate(b)
        catch foo2
            gettitle(a), gettitle(b)
        end
    end


    return !(isless(date_a, date_b))
end
"""
    {{library types file}}

print a library restricted to the comma separated list of types, from the optional library
`file`, which defaults to using the preloaded `data/bibliography.yaml`.

If no types are given all will be printed

"""
function hfun_bibliography(params)
    types = (length(params)>0) ? lowercase.(strip.(split(params[1],","))) : ["all",]
    library = (length(params)>1) ? YAML.load_file(params[2]) : bibliography
    reduced_library = filter( x-> (x[2]["biblatextype"] ∈ types) || ("all" ∈ types), library)
    list_html = "";
    if length(params) > 2
        title = params[3]
        if length(reduced_library) > 0
            list_html = """$(list_html)
                        <h2>$title</h2>
                    """
        end
    end
    list = sort(collect(reduced_library), lt=isless_bibtex, by=x->x[2])
    for entry ∈ list
        list_html = """$(list_html)
                        $(format_bibtex_entry(entry[2],entry[1]))
                    """
    end
    return  """
            <ol class="bibliography" style="counter-reset:bibitem $(length(list)+1)">
                $list_html
            </ol>
            """
end
hfun_library() = hfun_library([])
"""
    print entry with key`params[1]` from the library `params[2]`, which defaults to the preloaded `literature.yaml`
"""
function hfun_bibentry(params)
    key = params[1]
    library = (length(params)>1) ? YAML.load_file(params[2]) : bibliography
    entry = library[key]
    !(haskey(library,key)) && return "<li> key $key not found in library.</li>"
    return format_bibtex_entry(entry,key; list_style="key")
end
function formatspan(entry, field; class=field, prefix="", remove=[])
    fieldvalue = get(entry, field, "")
    prefix = isempty(prefix) ? "" : "$prefix "
    if fieldvalue isa Vector #concat list
        s = join( [ (has_name(name) ? hfun_person([name,"fullname_fnorcid"]) : """<span class="person unknown">$name</span>""") for name ∈ fieldvalue ], ", ")
        s = "$prefix$s"
    elseif field == "doi"
        s = """<a href="https://dx.doi.org/$fieldvalue">$fieldvalue</a>"""
        s = "<span class=doi>$prefix$s</span>"
    else
        s = """<span class="$field">$prefix$fieldvalue</span>"""
    end
    for r in remove
        s = replace(s, r => "")
    end
    return s
end

pagesprefix(entry) = haskey(entry,"pages") && contains(entry["pages"], "–") ? ", pp." : ", "

formatlazyspan(entry,field; kwargs...) = haskey(entry,field) ? formatspan(entry,field; kwargs...) : ""
function format_bibtex_entry(entry, key; list_style="number")
    names = join( [ "<nobr>$(has_name(name) ? hfun_person([name,"fullname_link_fnorcid"]) : """<span class="person unknown">$name</span>""")" for name ∈ entry["author"] ], ",</nobr> ") * "</nobr>"
    s = """<a name="$(key)"></a>"""
    # if haskey(entry,"image") && get(entry, "biblatextype", "") == "software" #image in assets
    #     @show fullresimg = entry["image"]
    #     @show lowresimg = "$(split(entry["image"], ".")[1])_lowres.jp2"
    #     s = """$s
    #         <div class="item-icon-wrapper">
    #             <a href="/assets/bib/$fullresimg"><img src="/assets/bib/$lowresimg" alt="Publication illustration image"></a>
    #         </div>
    #         """
    # end
    eprinturl = ""
    lowercase(get(entry,"eprinttype","")) == "arxiv" && (eprinturl = "https://arxiv.org/abs/")
    eprint_text_link = """$(formatlazyspan(entry,"eprinttype"))
    <a href="$(eprinturl)$(get(entry,"eprint",""))">$(get(entry,"eprint",""))</a>
    """
    # pubdetails = """$(formatlazyspan(entry, "editor"; prefix="in: "))$(formatlazyspan(entry,"booktitle"; prefix= haskey(entry,"editor") ? ": " : "in: "))$(formatlazyspan(entry, "chapter"; prefix=", Chapter "))$(formatlazyspan(entry,"journaltitle";class="journal"))$(formatlazyspan(entry,"series"; prefix=", "))$(formatlazyspan(entry,"volume"))$(formatlazyspan(entry,"number"))$(formatlazyspan(entry,"issue"))$(formatlazyspan(entry,"pages", prefix=pagesprefix(entry)))$(formatlazyspan(entry,"publisher"; prefix=", "))$(formatlazyspan(entry,"type"))$(formatlazyspan(entry,"language"; prefix=", "))$(formatlazyspan(entry,"school"; prefix=", "))$(formatlazyspan(entry,"note"))$(formatspan(entry,"year"))"""
    pubdetails = """$(formatlazyspan(entry, "editor"; prefix="in: "))$(formatlazyspan(entry,"booktitle"; prefix= haskey(entry,"editor") ? ": " : "in: "))$(formatlazyspan(entry, "chapter"; prefix=", Chapter "))$(formatlazyspan(entry,"journaltitle";class="journal"))$(formatspan(entry,"year"))"""
    s = """$s
           $(formatspan(entry,"title"; remove=["{","}"]))
        """
    s = """$s
           $(names)
        """
    s = """$s
           $(pubdetails)
        """
    s = """$s
           $(entry_to_list_icon(entry,"pdf"; iconstyle="fas fa-md", icon="fa-download"))
        """
    s = """$s
           $(formatlazyspan(entry, "doi"; prefix="doi: "))
        """
    s = """$s
           $( (get(entry, "biblatextype", "") == "online" || get(entry,"journaltitle","")=="") ? eprint_text_link : "")
        """
    # s = """$s
    #     <ul class="nav nav-icons">
    #     """
    #bibtex icon
    # s = """$s
    #     <li>
    #         <a data-toggle="collapse" href="#$key-bibtex" title="toggle visibility of the biblatex for $key">
    #             <i class="fas fa-md fa-file-code"></i>
    #         </a>
    #     </li>"""
    # if haskey(entry,"abstract") #abstract icon
    #     s = """$s
    #         <li>
    #             <a data-toggle="collapse" href="#$key-abstract" title="toggle abstract">
    #                 abstract
    #             </a>
    #         </li>"""
    # end
    # if lowercase(get(entry,"eprinttype",""))=="arxiv" #pdf icon -> arxiv
    #     s = """$(s)$(entry_to_list_icon(entry,"eprint"; linkprefix="https://arxiv.org/pdf/", iconstyle="fas fa-md", icon="fa-file-pdf"))"""
    # end
    # s = """$(s)$(entry_to_list_icon(entry,"doi"; linkprefix="http://dx.doi.org/", iconstyle="ai ai-lg", icon="ai-doi"))"""
    s = """$(s)$(entry_to_list_icon(entry,"github"; linkprefix="https://github.com/", iconstyle="fab fa-md", icon="fa-github"))"""
    # s = """$(s)$(entry_to_list_icon(entry,"link"; iconstyle="fas fa-md", icon="fa-link"))"""
    # s = """$(s)$(entry_to_list_icon(entry,"pdf"; iconstyle="fas fa-md", icon="fa-download"))"""
    # if haskey(entry,"isbn_link") && haskey(entry,"isbn")
    #     s = """$(s)$(entry_to_list_icon(entry,"isbn_link"; iconstyle="fas fa-md", icon="fa-book", title="ISBN: $(entry["isbn"])"))"""
    # end
    # s = """$s
    #     </ul>
    # """
    # if haskey(entry,"abstract") # abstract content
    #     abstract = strip(entry["abstract"])
    #     abstract = replace(abstract, "\n" => "\n\n")
    #     s = """$s
    #     <div id="$key-abstract" class="blockicon abstract collapse fas fa-md">
    #         <div class="content">$(fd2html(abstract; internal=true))</div>
    #     </div>
    #     """
    # end
    # # bibtex entry
    # s = """$s
    #     <div id="$key-bibtex" class="blockicon bibtex collapse fas fa-md fa-file-code">
    #         <div class="content">$(format_bibtex_code(entry, key))</div>
    #     </div>
    #     """
    #print some label? for the default number we just print a li and the numbering will be done by the outer ol in css
    key_label  = ""
    # otherwise we print a span for the label and the formatting has to still be done in css
    if lowercase(list_style) == "key"
        key_label="""<span class="li-label">$key</span>"""
    end
    return """<li>$(key_label)$s</li>"""
end
"""
    format_bibtex_code(entry,key)

use the dictionary `entry` and the bibliography `key` to format a biblatex output.
the type os taken from the `biblatextype` field (defaults to "article").
You can `exclude` a set of fields (by default those that are currently used to enhance the entry)
and the `joined` fields are arrays that are joined with `and` after the fields are checked for
valid `names` (from `names.yaml`), where the `bib` form of `name` is taken
"""
function format_bibtex_code(
    entry,
    key;
    excludes = ["biblatextype", "image", "link", "file", "github", "publication_date"],
    field_joins = ["author", "editor"]
    )
    s = "";
    for f ∈ keys(entry)
        if f ∉ excludes
            v = ""
            if f ∈ field_joins
                v = join(
                    [ has_name(name) ? hfun_person([name, "plain_bibname"]) : name for name ∈ entry[f] ],
                    " and ",
                )
            else
                v = entry[f]
            end
            multiline = lowercase(f) ∈ ["abstract"]
            s = "$s\n    $(f) = {$(multiline ? "\n    " : "")$(v)$(multiline ? "    " : "")},"
        end
    end
    s = """@$(get(entry, "biblatextype", "article")){$key,$s
        }"""
    return s
end