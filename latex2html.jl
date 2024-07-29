# A list of all the LaTeX conversion needed for the
# maths that I find in my personal abstracts

function latex2html(abstract)
    replace(abstract,
        "\\%" => "%",
        "--" => "–",
        "\\," => "&thinsp;",
        "\$m = 6\$" => "<i>m</i> = 6",
        "O(\$m\$)" => "O(<i>m</i>)",
        "O(\$m^2\$)" => "O(<i>m</i><sup>2</sup>)",
        "\\ " => "&thinsp;",
        "σtot-1" => "<i>σ</i><sub>tot</sub><sup>−1</sup>",
        "σtot" => "<i>σ</i><sub>tot</sub>",
        "τpre" => "<i>τ</i><sub>pre</sub>",
        "τseq" => "<i>τ</i><sub>seq</sub>",
        "\\&thinsp;" => "&thinsp;",
        "\\&gt" => ">",
        "< \\br>" => "<br>",
        "−1" => "<sup>−1</sup>",
        "F<sup>−1</sup>" => "F-1",
        "Ebio" => "<i>E</i><sub>bio</sub>",
    )
end

