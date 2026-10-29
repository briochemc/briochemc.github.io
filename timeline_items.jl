# Exports the dated items the interactive timeline shows (papers from data/articles.bib,
# talks from data/talks.yaml) to _libs/timeline/items.json. Run manually, like timeline.jl,
# when the data changes:
#
#     julia --project=. timeline_items.jl

using YAML, Dates
using Bibliography

const MONTHS = Dict(lowercase(m) => i for (i, m) in enumerate(Dates.LOCALES["english"].months_abbr))

# Bibliography.jl keeps month as whatever BibTeX had: "mar", "3", "March"...
function month_number(m::AbstractString)
    isempty(m) && return 1
    all(isdigit, m) && return parse(Int, m)
    get(MONTHS, lowercase(first(m, 3)), 1)
end

# Strip BibTeX's {{protective}} braces from titles
clean(s) = replace(s, r"[{}]" => "")

papers = map(collect(values(import_bibtex("data/articles.bib")))) do e
    y = parse(Int, e.date.year)
    m = month_number(e.date.month)
    Dict(
        "date" => string(y, "-", lpad(m, 2, '0')),
        "title" => clean(e.title),
        "venue" => clean(e.in.journal),
        "url" => isempty(e.access.doi) ? "" : "https://doi.org/" * e.access.doi,
        "key" => e.id,
    )
end
sort!(papers, by = p -> p["date"])

talks = map(YAML.load_file("data/talks.yaml")) do t
    d = Date(string(t["date"]))
    venue = haskey(t, "conference") ? get(t["conference"], "name", "") :
            haskey(t, "seminar") ? get(t["seminar"], "name", "") : ""
    Dict(
        "date" => Dates.format(d, "yyyy-mm"),
        "title" => strip(string(t["title"])),
        "venue" => strip(string(venue)),
        "url" => string(get(t, "link", "")),
        "key" => string(get(t, "key", "")),
    )
end
sort!(talks, by = t -> t["date"])

# Minimal JSON writer (no JSON dependency in the project environment)
jstr(s) = "\"" * replace(string(s), "\\" => "\\\\", "\"" => "\\\"", "\n" => " ") * "\""
jobj(d) = "{" * join(("$(jstr(k)):$(jstr(v))" for (k, v) in d), ",") * "}"
jarr(v) = "[\n" * join(("  " * jobj(x) for x in v), ",\n") * "\n]"

open("_libs/timeline/items.json", "w") do io
    print(io, "{\n\"papers\": ", jarr(papers), ",\n\"talks\": ", jarr(talks), "\n}\n")
end
println("wrote ", length(papers), " papers and ", length(talks), " talks to _libs/timeline/items.json")
