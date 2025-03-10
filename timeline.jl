using Pkg
Pkg.activate()
using CairoMakie
using Dates

fig = Figure(size = (810, 800))

years = 2001:5:year(Dates.now())

ax = Axis(fig[1, 1];
    xticks = (1:12, string.(first.(Dates.monthname.(1:12)))),
    yticks = (years, string.(years)),
    # yticks = [],
    aspect = DataAspect(),
    xgridvisible = false,
    ygridvisible = false,
    xtickwidth = 0,
    ytickwidth = 0,
    # limits = (0.5, 12.5, first(years) - 0.5, year(Dates.now()) + 0.5),
    limits = (1 - 8.3, 12 + 7, first(years) - 0.5, year(Dates.now()) + 0.5),
    topspinevisible = false,
    rightspinevisible = false,
    bottomspinevisible = false,
    leftspinevisible = false,
    xaxisposition = :top,
    # backgroundcolor = :pink,
)
hideydecorations!(ax)

squarepoly = Makie.Polygon([Point2f(-0.5, -0.5), Point2f(-0.5, 0.5), Point2f(0.5, 0.5), Point2f(0.5, -0.5), Point2f(-0.5, -0.5)])
# edupoly = Makie.Polygon([Point2f(-0.5, -0.5), Point2f(-0.5, 0.5), Point2f(0.5, -0.5), Point2f(-0.5, -0.5)])
internpoly = Makie.Polygon([Point2f(-0.5, -0.5), Point2f(-0.5, 0.5), Point2f(0.5, -0.5), Point2f(-0.5, -0.5)])
edupoly = squarepoly
# jobpoly = Makie.Polygon([Point2f(0.5, 0.5), Point2f(-0.5, 0.5), Point2f(0.5, -0.5), Point2f(0.5, 0.5)])
jobpoly = squarepoly

markeroptions = (
    # marker = :rect,
    markersize = 0.8,
    # strokecolor = :darkgray,
    markerspace = :data,
    # strokewidth = 1,
)

COLORS = Dict(
    "CSIRO" => "#4BA6CA",
    # "UNSW" => "#FFE600",
    # "UNSW" => "#da4726",
    "UNSW" => :black,
    "USC" => "#990000",
    "UCI" => "#255799",
    "Suez Water" => "#A9C542",
    "Société Générale" => :black,
    "École Polytechnique" => "#183F67",
    "Bioforce" => "#D73730",
    "Mecaplast" => "#D55034",
    "Dauphine + ENSAE" => "#2e4588",
    "Lycée Masséna" => "#508bbf",
)

jobs = [
    (start = "Sep 2024", finish = "Feb 2025", job = "Contract Researcher", at = "CSIRO", isintern = false),
    # (start = "Aug 2024", finish = "Present", job = "Adjunct Fellow", at = "UNSW", isintern = false),
    (start = "Oct 2021", finish = "Aug 2024", job = "Research Associate", at = "UNSW", isintern = false),
    (start = "Nov 2019", finish = "Oct 2021", job = "Postdoctoral Researcher", at = "USC", isintern = false),
    (start = "Sep 2017", finish = "Sep 2019", job = "Postdoctoral Research Scholar", at = "UCI", isintern = false),
    (start = "Mar 2017", finish = "Aug 2017", job = "Casual Research Assistant", at = "UNSW", isintern = true),
    (start = "Jun 2016", finish = "Dec 2016", job = "Mathematics Tutor", at = "UNSW", isintern = true),
    (start = "May 2011", finish = "Aug 2012", job = "Proposal Engineer", at = "Suez Water", isintern = false),
    (start = "Jul 2008", finish = "Jun 2009", job = "Forex Trader Assistant", at = "Société Générale", isintern = true),
    (start = "Apr 2007", finish = "Jul 2007", job = "Mathematics Research Intern", at = "École Polytechnique", isintern = true),
    (start = "Sep 2004", finish = "Feb 2005", job = "IT Intern", at = "Bioforce", isintern = true),
    (start = "Jul 2006", finish = "Jul 2006", job = "Assembly Line Worker", at = "Mecaplast", isintern = true),
# )
# education = (
    (start = "Jan 2013", finish = "Sep 2017", job = "PhD", at = "UNSW", isintern = false),
    (start = "Jan 2010", finish = "Dec 2010", job = "MSc", at = "UNSW", isintern = false),
    # (start = "Sep 2007", finish = "Jun 2008", job = "MSc", at = "Dauphine + ENSAE", isintern = false),
    (start = "Aug 2007", finish = "Jul 2009", job = "MSc", at = "Dauphine + ENSAE", isintern = false),
    (start = "Aug 2004", finish = "Jul 2007", job = "MSc", at = "École Polytechnique", isintern = false),
    (start = "Aug 2001", finish = "Jul 2004", job = "Preparatory Classes", at = "Lycée Masséna", isintern = false),
]

jobs = sort(jobs, by = x -> get_date(x.start))

DATEFORMAT = dateformat"u y"
get_date(mydate) = mydate == "Present" ? Dates.today() : Date(mydate, DATEFORMAT)

colors = cgrad(:tableau_superfishel_stone, categorical = true)

# dates = get_date("Jan $(first(years))"):Month(1):get_date("Present")
firstdate = get_date(first(jobs).start)
lastdate = get_date(last(jobs).finish)
dates = firstdate:Month(1):lastdate
x = month.(dates)
y = year.(dates)
bgcolor = "#f0f0f0"
bgcolor = :lightgray
scatter!(ax, x, y; markeroptions..., marker = squarepoly, color = bgcolor)
firstmonth = month(firstdate)
firstyear = year(firstdate)
scatter!(ax, 1:firstmonth, fill(firstyear, firstmonth); color = 1:firstmonth, markeroptions..., marker = squarepoly, colormap = cgrad([:white, bgcolor]))
lastmonth = month(lastdate)
lastyear = year(lastdate)
scatter!(ax, lastmonth:12, fill(lastyear, 12 - lastmonth + 1); color = lastmonth:12, markeroptions..., marker = squarepoly, colormap = cgrad([bgcolor, :white]))
# scatter!(ax, month(first(dates)), year(first(dates)); markeroptions..., marker = jobpoly, color = :lightgray)

function mybracket!(ax, cond, y, color, text)
    if cond
        x = 12.5
        y1, y2 = last(y) + 0.4, first(y) - 0.4
        align = (:left, :center)
    else
        x = 0.5
        y1, y2 = first(y) - 0.4, last(y) + 0.4
        align = (:right, :center)
    end
    bracket!(ax, x, y1, x, y2; offset = 5, width = 5, text, style = :square, color, rotation = 0, align, textcolor = color)
end

cond = false

# for (iedu, edu) in enumerate(education)
#     dates = get_date(edu.start):Month(1):get_date(edu.finish)
#     x = month.(dates)
#     y = year.(dates)
#     scatter!(ax, x, y; markeroptions..., marker = edupoly, color = COLORS[edu.at])
#     mybracket!(ax, cond, y, COLORS[edu.at], "$(edu.job)\n$(edu.at)")
# end
# You can tell I tried a few color palettes :) Ice fire it is!
# COLORS2 = cgrad(:Troy, 10; categorical = true, rev = true)[[5, 4, 3, 2, 6, 1, 7, 8, 9, 10]]
# COLORS2 = cgrad(:diverging_bkr_55_10_c35_n256, 10; categorical = true, rev = true)[[1, 2, 3, 4, 10, 5, 9, 8, 7, 6]]
# COLORS2 = cgrad(:diverging_bky_60_10_c30_n256, 10; categorical = true, rev = true)[[1, 2, 3, 4, 10, 5, 9, 8, 7, 6]]
COLORS2 = cgrad(:seaborn_icefire_gradient, 12; categorical = true, rev = true)[1 .+ [1, 2, 3, 4, 10, 5, 9, 8, 7, 6]]
# COLORS2 = cgrad(:berlin, 12; categorical = true, rev = true)[1 .+ [1, 2, 3, 4, 10, 5, 9, 8, 7, 6]]
# COLORS2 = cgrad(:Demuth, 10; categorical = true, rev = true)[[5, 4, 3, 2, 6, 1, 7, 8, 9, 10]]
# COLORS2 = cgrad([:black; cgrad(:Ingres, 8; categorical = true)[:]; :black], categorical = true, rev = true)[[5, 4, 3, 2, 6, 1, 7, 8, 9, 10]]
colorcount = 1

for (ijob, job) in enumerate(jobs)
    dates = get_date(job.start):Month(1):get_date(job.finish)
    x = month.(dates)
    y = year.(dates)

    if !job.isintern
        # color = COLORS[job.at]
        color = COLORS2[colorcount]
        # color = COLORS2[ijob]
        marker = job.isintern ? internpoly : squarepoly
        # scatter!(ax, x, y; markeroptions..., marker, color)
        scatter!(ax, x, y; markeroptions..., marker, color)
        sep = maximum(y) - minimum(y) == 0 ? " " : "\n"
        mybracket!(ax, cond, y, color, rich(rich("$(job.job)", font = :bold), "$(sep)$(job.at)"))
        cond = !cond
        colorcount += 1
    end
end

text!(ax, 6.5, 2025; text = "2025", align = (:center, :center))
text!(ax, 6.5, 2001; text = "2001", align = (:center, :center))


save("_assets/timeline.svg", fig)
fig