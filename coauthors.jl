# Papers vs coauthors table: writes data/coauthors.csv with one row per paper
# in data/articles.bib and one column per coauthor, 1 if coauthor, empty if not.
# Usage: julia --project=. coauthors.jl [output.csv]
using Bibliography

SELF = "Benoît Pasquier"  # appears on (almost) every paper, so left out of the columns

# spelling variants in articles.bib that refer to the same person
ALIASES = Dict("Benoit Pasquier" => SELF, "Tim DeVries" => "Timothy DeVries")

function fullname(a)
    n = replace(join(filter(!isempty, [a.first, a.middle, a.particle, a.last, a.junior]), " "), r"[{}]" => "")
    return get(ALIASES, n, n)
end

bib = import_bibtex("data/articles.bib")
papers = sort(collect(keys(bib)))
authors = Dict(k => unique(fullname.(bib[k].authors)) for k in papers)

# columns: coauthors ordered by number of shared papers (then alphabetically)
count(a) = sum(a in authors[k] for k in papers)
coauthors = unique(reduce(vcat, values(authors)))
filter!(!=(SELF), coauthors)
sort!(coauthors, by = a -> (-count(a), a))

quote_csv(s) = occursin(r"[,\"\n]", s) ? "\"" * replace(s, "\"" => "\"\"") * "\"" : s

out = length(ARGS) >= 1 ? ARGS[1] : "data/coauthors.csv"
open(out, "w") do io
    println(io, join(quote_csv.(["paper"; coauthors]), ","))
    for k in papers
        println(io, join([quote_csv(k); [a in authors[k] ? "1" : "" for a in coauthors]], ","))
    end
end
println("Wrote $out ($(length(papers)) papers × $(length(coauthors)) coauthors)")
