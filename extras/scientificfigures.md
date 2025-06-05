# Scientific figures



## Legends are OK but annotations are better

Annotate your figures directly instead of using legends.
Legends are OK, but back and forth between data and legend costs your reader time and energy.
By annotating data with labels, your remove clutter and hold the hand of the reader.

\note{Note}{The figures below are made using Julia and its Makie plotting library.}

Consider the example below:


\figenvwithcode{
Figure 1: Some suspiciously sinusoidal data from 2 sources plotted with a legend (left panel) or with annotations (right panel).
Which one do you like best? Be honest!
}{/assets/extras/scientificfigures/code/output/scientificfigures1.svg}{width:100%}{
```julia:./code/scientificfigures1
using CairoMakie
# Some sinusoidal data
xA = 3 .+ range(0, 2π, 100)
yA = sin.(xA)# + 0.1randn(size(xA))
xB = 3.5 .+ range(0, 1.6π, 50)
yB = sin.(xB .+ π/2)# + 0.2randn(size(xB))
# some options
backgroundcolor = "#f5f6fa"
titlealign = :left
spinewidth = 0
# start figure
f = Figure(; size = (500, 400), fontsize = 18, backgroundcolor)
# left panelA
ax = Axis(f[1,1]; spinewidth, title = "Legends are OK.", titlealign)
lines!(ax, xA, yA; color = :gray, label = "A")
lines!(ax, xB, yB; color = :tomato, label = "B")
axislegend(ax; position = :rb)
hidedecorations!(ax)
# right panel
ax = Axis(f[1,2]; spinewidth, title = "Annotations are better.", titlealign)
lines!(ax, xA, yA; color = :gray)
lines!(ax, xB, yB; color = :tomato)
# Add annotations
annotation!(ax, 0, -10, xA[end], yA[end]; text = "A")
annotation!(ax, 0, -10, xB[end], yB[end]; text = "B")
hidedecorations!(ax)
# Annotations with lines
ax = Axis(f[2,1]; spinewidth, title = "Many ways to annotation...", titlealign)
lines!(ax, xA, yA; color = :gray)
lines!(ax, xB, yB; color = :tomato)
# Add annotations
# place A and B labels
annotation!(+30, -15, xA[50], yA[50]; text = "A", path = Ann.Paths.Line())
annotation!(-30, +15, xB[15], yB[15]; text = "B", path = Ann.Paths.Line())
hidedecorations!(ax)
# Annotations with lines
ax = Axis(f[2,2]; spinewidth, title = "So chose wisely!", titlealign)
lines!(ax, xA, yA; color = :gray)
lines!(ax, xB, yB; color = :tomato)
# Add annotations
# place A and B labels
style = Ann.Styles.LineArrow(head = Ann.Arrows.Head())
path = Ann.Paths.Arc(-0.3)
annotation!(+40, -10, xA[50], yA[50]; text = "A", path, style)
path = Ann.Paths.Arc(0.3)
annotation!(-40, +10, xB[15], yB[15]; text = "B", path, style)
hidedecorations!(ax)
save(joinpath(@OUTPUT, "scientificfigures1.svg"), f) # hide
```
}




## How to label ticks when dealing with calendar years

\figenvwithcode{
Enter caption here!
}{/assets/extras/scientificfigures/code/output/scientificfigures2.svg}{width:100%}{
```julia:./code/scientificfigures2
using CairoMakie, Dates
# Some sinusoidal data
x = Date(2000, 1, 15):Month(3):Date(2003, 1, 15) |> collect
y = rand(length(x))# + 0.1randn(size(xA))
# some options
backgroundcolor = "#f5f6fa"
titlealign = :left
spinewidth = 0
# start figure
f = Figure(; size = (500, 600), fontsize = 18, backgroundcolor)
# left panelA
x2 = year.(x) + month.(x) / 12 + day.(x) / 365
# xticks = Date(2000, 1, 1):Month(12):Date(2003, 1, 15)
# xticklabels = string.(year.(xtickrange))
# xticks = (xticks, string.(year.(xticks)))
# ax = Axis(f[1,1]; spinewidth, title = "Ambiguous ticks (start/middle of the year??)", titlealign)
# dim1_conversion = Makie.DateTimeConversion(Date)
ax = Axis(f[1,1];  spinewidth, title = "Ambiguous ticks (start/middle of the year?)", titlealign)
lines!(ax, x2, y; color = :gray, label = "A")
# xticks!(ax; xtickrange)
# xticks!(ax; xtickrange, xticklabels)
# foo
hideydecorations!(ax)
# right panel
ax = Axis(f[2,1]; spinewidth, title = "Annotations are better.", titlealign)
lines!(ax, x2, y; color = :gray)
# hidedecorations!(ax)
save(joinpath(@OUTPUT, "scientificfigures2.svg"), f) # hide
```
}
