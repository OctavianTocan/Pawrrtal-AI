import type { ThemeFile } from '@/lib/craft-shared/config/theme'
import catppuccin from './catppuccin.json'
import defaultTheme from './default.json'
import dracula from './dracula.json'
import ghostty from './ghostty.json'
import github from './github.json'
import gruvbox from './gruvbox.json'
import haze from './haze.json'
import nightOwl from './night-owl.json'
import nord from './nord.json'
import oneDarkPro from './one-dark-pro.json'
import pierre from './pierre.json'
import rosePine from './rose-pine.json'
import solarized from './solarized.json'
import tokyoNight from './tokyo-night.json'
import vitesse from './vitesse.json'

export const bundledThemes: Record<string, ThemeFile> = {
  catppuccin: catppuccin as ThemeFile,
  default: defaultTheme as ThemeFile,
  dracula: dracula as ThemeFile,
  ghostty: ghostty as ThemeFile,
  github: github as ThemeFile,
  gruvbox: gruvbox as ThemeFile,
  haze: haze as ThemeFile,
  'night-owl': nightOwl as ThemeFile,
  nord: nord as ThemeFile,
  'one-dark-pro': oneDarkPro as ThemeFile,
  pierre: pierre as ThemeFile,
  'rose-pine': rosePine as ThemeFile,
  solarized: solarized as ThemeFile,
  'tokyo-night': tokyoNight as ThemeFile,
  vitesse: vitesse as ThemeFile,
}
