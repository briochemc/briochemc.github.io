#
# Load and handle data for names of people and things
#
using YAML
names = YAML.load_file("data/names.yaml")
people = names["people"]
institutes = names["institutes"]

"""
    {{person Person style}}

Print the name of a person fom the `names.yml` `person` dictionary in different styles
* `fullname` – display full name, which is the default
* `shortname` - display first name in short
* `bibname` – display last name, first name

All following styles are ignored without an error if the corresponding field does not exist
Additionally you can style the name with a prefix
* `link_` to wrap the name in a link to their `url`
* `plain_` to get a non-html variant of the name. Then the postfixes (in the following) are ignored

postfix a <sup> icon link to
* `_fntwitter` – to add a `twitter` icon link
* `_fngithub` – to add their `github` icon link
* `_fnorcid` – to add their `orcid` id link
* `_fnscholar` to add their google `scholar` link

where their order of appearance orders the supnotes.

# Example Styles
* `link_fullname_fntwitter` link the fullname to the url and add a twitter note
* `bibname_fnorcid_fnscholar` add orcid and scholar footnotes to the bibname
"""
function hfun_person(params::Vector{String})::String
    name = params[1]
    style = (length(params) > 1) ? params[2] : "link_fullname"
    s = ""
    !has_name(name) && return "<span class\"error\">Person „$(name)“ not found</span>"
    person = names["people"][name]
    fullname = person["name"]["full"]
    shortname = get(person["name"], "short", fullname)
    bibname = person["name"]["bib"]
    title_fullname = "$(get(person, "title", ""))$(haskey(person,"title") ? " " : "")$(person["name"]["full"])"
    occursin("shortname",style) && (s = shortname)
    occursin("nametitle", style) && (s = title_fullname)
    occursin("bibname", style) && (s = bibname)
    occursin("fullname",style) && (s = fullname)
    occursin("plain_", style) && return s

    if occursin("Pasquier", name)
        # s = """<span class="person" style="font-weight:bold">$s</span>"""
        # s = """<span class="person" style="color:rgb(0,85,164)">$s</span>"""
        # s = """<span class="person" style="color:rgb(247, 113, 125)">$s</span>"""
        s = """<span class="person" style="color:rgb(214, 81, 8)">$s</span>"""
    # else
    #     s = """<span class="person" style="color:rgb(0,0,0)">$s</span>"""
    end
    # (haskey(person,"url") && occursin("link_",style)) && (s = """<a href="$(person["url"])">$s</a>""")
    # supnotes = ["twitter", "github", "orcid", "scholar", "arxiv"]
    supnotes = []
    supurlprefixes = ["https://twitter.com/", "https://github.com/", "https://orcid.org/", "https://scholar.google.com/citations?user=", "https://arxiv.org/a/"]
    icons = [
        """<i class="fab fa-twitter"></i>""",
        """<i class="fab fa-github"></i>""",
        """<i class="ai ai-orcid"></i>""",
        """<i class="ai ai-google-scholar"></i>""",
        """<i class="ai ai-arxiv"></i>""",
    ]
    pos = [ occursin("_fn$fn", style) ? first(findfirst(fn,style)) : -1 for fn in supnotes]
    for i in sortperm(pos)
        if haskey(person,supnotes[i]) && (pos[i] > 0)
            s = """$s<sup><a href="$(supurlprefixes[i])$(person[supnotes[i]])">$(icons[i])</a></sup>"""
        end
    end
    return s
end
function has_name(key)
    return haskey(names["people"],key)
end
"""
    {{institute name style}}

Print the institute from the institutes list in a certain style, namely
* `full` (default) display a name
* `short` display the short name

if a `url` is given the institute is linked to said url.
"""
function hfun_institute(param::Vector{String})::String
    name = param[1]
    style = (length(param) > 1 ? param[2] : "full")
    return institute_name(name,style)
end
function institute_name(name,style)
    display_name = "";
    if haskey(institutes,name)
        display_name = haskey(institutes[name], style) ? institutes[name][style] : institutes[name]["name"]
        if haskey(institutes[name],"url")
            display_name = """<a href="$(institutes[name]["url"])" alt="link to $display_name">$display_name</a>"""
        end
        display_name = """<span class="institute">$display_name</span>"""
    else
        display_name = """<span class="institute error">$name not found in institutes</span>"""
    end
    return display_name
end