# SPHERE KaTeX equations

These expressions use standard KaTeX-supported commands and can be copied directly into Mission Control.

## Newtonian cooling model

```latex
T(t)=T_{\mathrm{env}}+\left(T_0-T_{\mathrm{env}}\right)e^{-kt}
```

## Sensible-energy change

```latex
\Delta Q = m c_p \Delta T
```

## Residual

```latex
r_i=T_{\mathrm{measured},i}-T_{\mathrm{model},i}
```

## Mean absolute error

```latex
\mathrm{MAE}=\frac{1}{n}\sum_{i=1}^{n}\left|r_i\right|
```

## Effective cooling coefficient from one point

```latex
k=-\frac{1}{t}\ln\left(\frac{T(t)-T_{\mathrm{env}}}{T_0-T_{\mathrm{env}}}\right)
```

The report defines $k$ in $\mathrm{min}^{-1}$. It is an effective coefficient for the complete test system, not the thermal conductivity of an individual insulation material.
