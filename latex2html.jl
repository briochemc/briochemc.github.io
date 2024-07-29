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
        "\\&gt;" => ">",
        "< \\br>" => "<br>",
        "−1" => "<sup>−1</sup>",
        "F<sup>−1</sup>" => "F-1",
        "Ebio" => "<i>E</i><sub>bio</sub>",
        "pCO2" => "<i>p</i>CO<sub>2</sub>",
        " CO2" => " CO<sub>2</sub>", # can't use "CO2" without a space before because of PCO2 model.
        "Nsoft" => "<i>N</i><sub>soft</sub>",
        "Ncarb" => "<i>N</i><sub>carb</sub>",
        "εNd" => "<i>ε</i><sub>Nd</sub>",
    )
end

