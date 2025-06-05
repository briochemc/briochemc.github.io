# Scientific figures



## Legends are OK but annotations are better

Annotate your figures directly instead of using legends.
Legends are OK, but back and forth between data and legend costs your reader time and energy.
By annotating data with labels, your remove clutter and hold the hand of the reader.

\note{Note}{The figures below are made using the [Julia](https://julialang.org/) programming language and the [Makie.jl](https://docs.makie.org/stable/) plotting library. There is a button to display the code for creating each figure but beware! The code includes lots of little tweaks for style that you don't really need in general for making good scientific figures.}

Consider the example below:


\figenvwithcode{
Figure 1: Some suspiciously sinusoidal data from 2 sources plotted with a legend or with annotations.
Which one do you like best?
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
options = (
    spinewidth = 0,
    # titlegap = -25,
    yautolimitmargin = (0.05f0, 0.25),
)
# start figure
f = Figure(; size = (500, 400), fontsize = 18, backgroundcolor)
# left panelA
ax = Axis(f[1,1]; options...)
lines!(ax, xA, yA; color = :gray, label = "A")
lines!(ax, xB, yB; color = :tomato, label = "B")
text!(ax, 0, 1; space = :relative, text = rich("Legends are OK.", font = :bold), offset = (5, -5), align = (:left, :top))
axislegend(ax; position = :rb)
hidedecorations!(ax)
# right panel
ax = Axis(f[1,2]; options...)
lines!(ax, xA, yA; color = :gray)
lines!(ax, xB, yB; color = :tomato)
text!(ax, 0, 1; space = :relative, text = rich("Annotations are better.", font = :bold), offset = (5, -5), align = (:left, :top))
# Add annotations
annotation!(ax, 0, -10, xA[end], yA[end]; text = "A")
annotation!(ax, 0, -10, xB[end], yB[end]; text = "B")
hidedecorations!(ax)
# Annotations with lines
ax = Axis(f[2,1]; options...)
lines!(ax, xA, yA; color = :gray)
lines!(ax, xB, yB; color = :tomato)
text!(ax, 0, 1; space = :relative, text = rich("Many ways to annotate...", font = :bold), offset = (5, -5), align = (:left, :top))
# Add annotations
# place A and B labels
annotation!(+30, -15, xA[50], yA[50]; text = "A", path = Ann.Paths.Line())
annotation!(-30, +15, xB[15], yB[15]; text = "B", path = Ann.Paths.Line())
hidedecorations!(ax)
# Annotations with lines
ax = Axis(f[2,2]; options...)
lines!(ax, xA, yA; color = :gray)
lines!(ax, xB, yB; color = :tomato)
text!(ax, 0, 1; space = :relative, text = rich("So chose wisely!", font = :bold), offset = (5, -5), align = (:left, :top))
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
using CairoMakie, Dates, DateFormats
# Some sinusoidal data
x = Date(1999, 9, 15):Month(3):Date(2003, 8, 15) |> collect
xdec = yeardecimal.(x)
y = rand(length(x))# + 0.1randn(size(xA))
# some options
backgroundcolor = "#f5f6fa"
options = (
    titlealign = :left,
    topspinevisible = false,
    leftspinevisible = false,
    rightspinevisible = false,
    bottomspinevisible = false,
)
# start figure
f = Figure(; size = (500, 600), fontsize = 18, backgroundcolor)
# top panel
xticks = Date(2000, 1, 1):Month(12):x[end]
xticks = yeardecimal.(xticks)
color = :tomato
ax = Axis(f[1,1]; options..., xticks, title = rich(rich("Ambiguous ticks..."; color), " At the start or middle of the year?"), xticklabelcolor = color)
lines!(ax, xdec, y; color = :gray)
hideydecorations!(ax)
# middle panel
xticks = Date(2000, 1, 1):Month(12):x[end]
xticks = (yeardecimal.(xticks), string.(xticks))
color = "#EB9C0A"
ax = Axis(f[2,1]; options..., xticks, title = rich(rich("Full date"; color), " is less ambiguous ", rich("but too cluttered..."; color)), xticklabelcolor = color)
lines!(ax, xdec, y; color = :gray)
hideydecorations!(ax)
# bottom panel
xticks = Date(2000, 1, 1):Year(1):x[end]
xticks = yeardecimal.(xticks)
xticks = (xticks, fill("", length(xticks)))
color = "#499167"
ax = Axis(f[3,1]; options..., xticks, title = rich("Best is to label ", rich("between ticks!"; color)))
lines!(ax, xdec, y; color = :gray)
hideydecorations!(ax)
xticks = Date(2000, 7, 1):Year(1):x[end]
xticks = yeardecimal.(xticks)
xticks = (xticks, string.(round.(Int, floor.(xticks))))
ax2 = Axis(f[3,1]; options..., xticks, xticklabelcolor = color, xticksize = 0, xgridvisible = false)
linkaxes!(ax, ax2)
hidespines!(ax2)
hideydecorations!(ax2)
rowgap!(f.layout, 40)
save(joinpath(@OUTPUT, "scientificfigures2.svg"), f) # hide
```
}
