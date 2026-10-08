# Coauthor network: nodes are coauthors, edge weights are the number of papers
# two people share. Reads data/coauthors.csv (made by ../coauthors.jl) and
# writes network/coauthor_network.png.
# Usage (from the repo root): julia --project=network network/coauthor_network.jl
using DelimitedFiles, Random, LinearAlgebra
using Graphs, CairoMakie, GraphMakie

raw, header = readdlm("data/coauthors.csv", ',', Any; header=true)
names = String.(vec(header)[2:end])
X = Float64.(coalesce.(replace(raw[:, 2:end], "" => 0), 0))   # papers × coauthors, 0/1
W = X' * X                                                    # W[i,j] = papers shared by i and j
W[diagind(W)] .= 0                                            # drop self-loops
n = length(names)

g = SimpleGraph(n)
for i in 1:n, j in i+1:n
    W[i, j] > 0 && add_edge!(g, i, j)
end

# Louvain-style local moving (phase 1): move each node to the neighbouring
# community that most increases weighted modularity, until nothing moves.
function communities(W; rng=MersenneTwister(1))
    n = size(W, 1)
    k = vec(sum(W, dims=2)); m2 = sum(k)
    c = collect(1:n)
    tot = copy(k)                        # total degree of each community
    moved = true
    while moved
        moved = false
        for i in shuffle(rng, 1:n)
            old = c[i]
            tot[old] -= k[i]
            links = Dict{Int,Float64}()  # weight from i to each neighbouring community
            for j in findall(>(0), W[i, :])
                links[c[j]] = get(links, c[j], 0.0) + W[i, j]
            end
            best, gain = old, get(links, old, 0.0) - tot[old] * k[i] / m2
            for (cc, w) in links
                gc = w - tot[cc] * k[i] / m2
                gc > gain + 1e-12 && ((best, gain) = (cc, gc))
            end
            tot[best] += k[i]
            c[i] = best
            best != old && (moved = true)
        end
    end
    return indexin(c, unique(c))         # relabel 1..K
end
comm = communities(W)
K = maximum(comm)

# Weighted Fruchterman–Reingold layout (NetworkLayout's spring ignores weights):
# springs pull linked people together in proportion to shared papers, all nodes
# repel, and a weak gravity keeps disconnected groups from drifting off.
function weighted_layout(W; iterations=600, seed=1)
    rng = MersenneTwister(seed)
    n = size(W, 1)
    P = randn(rng, 2, n)
    for t in 1:iterations
        T = 0.3 * (1 - t / iterations) + 0.005       # cooling "temperature" caps the step size
        F = zeros(2, n)
        for i in 1:n, j in i+1:n
            d = P[:, i] - P[:, j]
            r = max(norm(d), 1e-3)
            f = (1 / r^2 - W[i, j] * r) .* d ./ r     # repulsion 1/r, attraction w·r
            F[:, i] += f; F[:, j] -= f
        end
        F .-= 0.05 .* P                               # gravity
        for i in 1:n
            P[:, i] += F[:, i] ./ max(norm(F[:, i]), 1e-9) .* min(norm(F[:, i]), T)
        end
    end
    return [Point2f(P[:, i]...) for i in 1:n]
end
pos = weighted_layout(W)
layout = _ -> pos

palette = Makie.wong_colors()
ncolors = [palette[mod1(c, length(palette))] for c in comm]
ew = [W[src(e), dst(e)] for e in edges(g)]
deg = vec(sum(W, dims=2))

fig = Figure(size=(1600, 1200))
ax = Axis(fig[1, 1]; aspect=DataAspect())
hidedecorations!(ax); hidespines!(ax)
graphplot!(ax, g; layout,
    node_color=ncolors, node_size=8 .+ 3 .* deg,
    edge_width=0.8 .+ 1.5 .* ew, edge_color=(:gray, 0.5),
    nlabels=names, nlabels_align=(:center, :bottom), nlabels_fontsize=12,
)
save("network/coauthor_network.png", fig)
println("$n coauthors, $(ne(g)) links, $K communities → network/coauthor_network.png")
