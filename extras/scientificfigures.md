# Scientific figures

Data visualization plays a key role in science communication, and good figure-making skills is a crucial asset for scientists.
However, flawless figures are rare, including in the peer-reviewed scientific literature, and even in high-profile journals.
Most published figures can be improved by applying common-sense principles.
[Ugh!]() These principles include being honest and truthful (not misleading), being clear, easy to understand, require the least effort on the part of the reader, and being beautiful.

Below are some of my personal pet peeves about scientific figures, with solutions on how to fix them.
Now, obviously, context matters, and different readers expect different schemas, and my own judgement is unavoidably partial, but it is nevertheless useless to be critical of the way data is communicated.
At worst, we can disagree that this or that is better, easier to understand, or prettier, and that's OK.
But at the very least, this remains a good exercise to practice, challenge, and improve one's figure-making skills.


\note{Note}{The figures below are made using the [Julia](https://julialang.org/) programming language and the [Makie.jl](https://docs.makie.org/stable/) plotting library. There is a button to display the code for creating each figure but beware! The code includes lots of little tweaks for style that you don't really need in general for making good scientific figures.}


## Legends are OK but annotations are better

<!-- Annotate your figures directly instead of using legends. -->
Legends are OK, but make your reader go back and forth between data and legend, costing time and energy.
It's also often a pain to place the legend so that it does not hide any data.
Instead, by annotating data with labels directly, you make the figure clearer and help the reader directly see what data they are looking at.
Consider the exmples below.


\figenvwithcode{
Figure 1: Some data from 2 sources (A and B) plotted with a legend or with annotations.
The legend hides some data and its "order" does not match the data (A is above B in the legend, but B is above A in the data).
Which one do you like best?
}{/assets/extras/scientificfigures/code/output/scientificfigures1.svg}{width:100%}{
```julia:./code/scientificfigures1
using CairoMakie
# Some sinusoidal data
x = 3 .+ range(0, 2π, 100)
yA = sin.(2x) + 0.1randn(size(x))
yB = 1.5 .+ sin.(1.2x) + 0.1randn(size(x))
# some options

backgroundcolor = "#f5f6fa"
options = (
    spinewidth = 0,
    # titlegap = -25,
    # yautolimitmargin = (0.05f0, 0.25),
    backgroundcolor = :white,
    titlealign = :left,
)
# start figure
f = Figure(; size = (600, 500), fontsize = 18, backgroundcolor)

g1 = GridLayout(f[1, 1], alignmode = Outside(15))
g2 = GridLayout(f[1, 2], alignmode = Outside(15))
g3 = GridLayout(f[2, 1], alignmode = Outside(15))
g4 = GridLayout(f[2, 2], alignmode = Outside(15))
box1 = Box(f[1, 1], cornerradius = 10, color = (:tomato, 0.3), strokewidth = 0)
box2 = Box(f[1, 2], cornerradius = 10, color = ("#499167", 0.3), strokewidth = 0)
box3 = Box(f[2, 1], cornerradius = 10, color = ("#499167", 0.3), strokewidth = 0)
box4 = Box(f[2, 2], cornerradius = 10, color = ("#499167", 0.3), strokewidth = 0)
# move the boxes back so the Axis background polys are in front of them
Makie.translate!(box1.blockscene, 0, 0, -100)
Makie.translate!(box2.blockscene, 0, 0, -100)
Makie.translate!(box3.blockscene, 0, 0, -100)
Makie.translate!(box4.blockscene, 0, 0, -100)
# left panel
ax = Axis(g1[1,1]; options..., title = "Legends are OK but...")
lines!(ax, x, yA; color = :gray, label = "A")
lines!(ax, x, yB; color = :tomato, label = "B")
axislegend(ax; position = :rb)
hidedecorations!(ax)
# right panel
ax = Axis(g2[1,1]; options..., title = "Annotations are better!", xautolimitmargin = (0.05f0, 0.10))
lines!(ax, x, yA; color = :gray)
lines!(ax, x, yB; color = :tomato)
# Add annotations
annotation!(ax, 10, 0, x[end], yA[end]; text = "A")
annotation!(ax, 10, 0, x[end], yB[end]; text = "B")
hidedecorations!(ax)
# Annotations with lines
ax = Axis(g3[1,1]; options..., title = "Many ways to annotate...")
lines!(ax, x, yA; color = :gray)
lines!(ax, x, yB; color = :tomato)
# Add annotations
# place A and B labels
annotation!(+30, -15, x[50], yA[50]; text = "A", path = Ann.Paths.Line())
annotation!(-30, +15, x[40], yB[40]; text = "B", path = Ann.Paths.Line())
hidedecorations!(ax)
# Annotations with lines
ax = Axis(g4[1,1]; options..., title = "So chose wisely!")
lines!(ax, x, yA; color = :gray)
lines!(ax, x, yB; color = :tomato)
# Add annotations
# place A and B labels
style = Ann.Styles.LineArrow(head = Ann.Arrows.Head())
path = Ann.Paths.Arc(-0.3)
annotation!(+40, -10, x[50], yA[50]; text = "A", path, style)
path = Ann.Paths.Arc(0.3)
annotation!(-40, +10, x[40], yB[40]; text = "B", path, style)
hidedecorations!(ax)
save(joinpath(@OUTPUT, "scientificfigures1.svg"), f) # hide
```
}




## How to label ticks when dealing with calendar years

\figenvwithcode{
Enter caption here!!
}{/assets/extras/scientificfigures/code/output/scientificfigures2.svg}{width:100%}{
```julia:./code/scientificfigures2
using CairoMakie, Dates, DateFormats
# Some sinusoidal data
x = Date(1999, 9, 15):Month(3):Date(2003, 8, 15) |> collect
xdec = yeardecimal.(x)
y = rand(length(x))# + 0.1randn(size(x))
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
xticks = Date(2000, 7, 1):Year(1):x[end]
xticks = yeardecimal.(xticks)
xminorticks = Date(2000, 1, 1):Year(1):x[end]
color = "#499167"
extraoptions = (
    xticks = (xticks, string.(round.(Int, floor.(xticks)))),
    xminorticks = yeardecimal.(xminorticks),
    xminorticksvisible = true,
    xminorgridvisible = true,
    xminorticksize = 5,
    xticksvisible = false,
    xgridvisible = false,
    xticklabelcolor = color,
)
Box(f[3, 1], color = :red)
ax = Axis(f[3,1]; options..., extraoptions..., title = rich("Best is to label ", rich("between ticks!"; color)))
lines!(ax, xdec, y; color = :gray)
hideydecorations!(ax)
rowgap!(f.layout, 40)
save(joinpath(@OUTPUT, "scientificfigures2.svg"), f) # hide
```
}

## Avoid logscales with bars

Bar plots are good to visualize and compare amounts, and logscales are good to compare large differences.
But bars combined with a logarithmic scale generally make no sense.
This is because the lengths of the bars is completely arbitrary, as it is controlled by the location of the bottom of the bars, which can be anywhere on the logarithmic scale (should it be 1? 1000? 0.001?).

\figenvwithcode{
Enter caption here!
}{/assets/extras/scientificfigures/code/output/scientificfigures3.svg}{width:100%}{
```julia:./code/scientificfigures3
using CairoMakie, MakieExtra
# Some sinusoidal data
data = [3210, 666, 42] * 1e6
x = 1:length(data)
# some options
backgroundcolor = "#f5f6fa"
options = (
    titlealign = :left,
    topspinevisible = false,
    leftspinevisible = true,
    rightspinevisible = false,
    bottomspinevisible = true,
    yminorticksvisible = true,
    xticks = (x, string.(range('A', length=length(data)))),
    ytickformat = EngTicks(),
)
logoptions = (
    yscale = log10,
    yminorticks = BaseMulTicks(1:9),
)
# start figure
f = Figure(; size = (500, 200), fontsize = 18, backgroundcolor)
# left panel
ax = Axis(f[1,1]; options..., logoptions..., title = "No tgood", yticks = BaseMulTicks([1]))
barplot!(ax, x, data; color = :gray)
ylims!(ax, 21e6, nothing)
# middle panel
ax = Axis(f[1,2]; options..., logoptions..., title = "No good", yticks = BaseMulTicks([1], base = 1e3))
barplot!(ax, x, data; color = :gray, fillto = 1)
ylims!(ax, 1, nothing)
# hidedecorations!(ax)
# right panel
ax = Axis(f[1,3]; options..., title = "Better")
barplot!(ax, x, data; color = :gray)
ylims!(ax, 0, nothing)
# hideydecorations!(ax)
save(joinpath(@OUTPUT, "scientificfigures3.svg"), f) # hide
```
}

