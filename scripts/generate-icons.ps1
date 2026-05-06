$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function New-KeigoIcon {
  param(
    [string]$Path,
    [int]$Size
  )

  $bitmap = New-Object System.Drawing.Bitmap -ArgumentList $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $rect = New-Object System.Drawing.Rectangle -ArgumentList 0, 0, $Size, $Size
  $background = New-RoundedRectPath -X 0 -Y 0 -Width ($Size - 1) -Height ($Size - 1) -Radius ([Math]::Max(3, [float]($Size * 0.22)))
  $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList $rect, ([System.Drawing.Color]::FromArgb(20, 55, 122)), ([System.Drawing.Color]::FromArgb(35, 123, 196)), 45
  $graphics.FillPath($backgroundBrush, $background)

  $glowBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(46, 255, 255, 255))
  $graphics.FillEllipse($glowBrush, [float]($Size * 0.12), [float]($Size * 0.08), [float]($Size * 0.52), [float]($Size * 0.34))

  $paper = New-RoundedRectPath -X ([float]($Size * 0.18)) -Y ([float]($Size * 0.18)) -Width ([float]($Size * 0.46)) -Height ([float]($Size * 0.60)) -Radius ([float]($Size * 0.09))
  $paperBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(250, 255, 255, 255))
  $paperBorder = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(191, 219, 254)), ([float]([Math]::Max(1.5, $Size * 0.018)))
  $graphics.FillPath($paperBrush, $paper)
  $graphics.DrawPath($paperBorder, $paper)

  $linePen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(148, 163, 184)), ([float]([Math]::Max(1.2, $Size * 0.016)))
  for ($i = 0; $i -lt 3; $i++) {
    $y = [float]($Size * (0.31 + ($i * 0.11)))
    $graphics.DrawLine($linePen, [float]($Size * 0.26), $y, [float]($Size * 0.56), $y)
  }

  $accentBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(37, 99, 235))
  $fontSize = [float]([Math]::Max(8, $Size * 0.22))
  $font = New-Object System.Drawing.Font -ArgumentList "Yu Gothic UI", $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textRect = New-Object System.Drawing.RectangleF -ArgumentList ([float]($Size * 0.22)), ([float]($Size * 0.19)), ([float]($Size * 0.38)), ([float]($Size * 0.22))
  $graphics.DrawString("K", $font, $accentBrush, $textRect, $format)

  $checkPen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(22, 163, 74)), ([float]([Math]::Max(2.2, $Size * 0.06)))
  $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $points = New-Object 'System.Drawing.PointF[]' 3
  $points[0] = New-Object System.Drawing.PointF -ArgumentList ([float]($Size * 0.53)), ([float]($Size * 0.62))
  $points[1] = New-Object System.Drawing.PointF -ArgumentList ([float]($Size * 0.65)), ([float]($Size * 0.74))
  $points[2] = New-Object System.Drawing.PointF -ArgumentList ([float]($Size * 0.84)), ([float]($Size * 0.40))
  $graphics.DrawLines($checkPen, $points)

  $badgeBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(255, 239, 68, 68))
  $graphics.FillEllipse($badgeBrush, [float]($Size * 0.66), [float]($Size * 0.12), [float]($Size * 0.18), [float]($Size * 0.18))

  $badgeInnerBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::White)
  $badgeFont = New-Object System.Drawing.Font -ArgumentList "Segoe UI", ([float]([Math]::Max(7, $Size * 0.11))), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $badgeRect = New-Object System.Drawing.RectangleF -ArgumentList ([float]($Size * 0.665)), ([float]($Size * 0.125)), ([float]($Size * 0.17)), ([float]($Size * 0.17))
  $graphics.DrawString("C", $badgeFont, $badgeInnerBrush, $badgeRect, $format)

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $badgeFont.Dispose()
  $badgeInnerBrush.Dispose()
  $badgeBrush.Dispose()
  $checkPen.Dispose()
  $format.Dispose()
  $font.Dispose()
  $accentBrush.Dispose()
  $linePen.Dispose()
  $paperBorder.Dispose()
  $paperBrush.Dispose()
  $paper.Dispose()
  $glowBrush.Dispose()
  $backgroundBrush.Dispose()
  $background.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-KeigoIcon -Path "icon16.png" -Size 16
New-KeigoIcon -Path "icon48.png" -Size 48
New-KeigoIcon -Path "icon128.png" -Size 128
