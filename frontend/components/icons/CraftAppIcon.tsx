import { CraftAgentsSymbol } from '@/components/icons/CraftAgentsSymbol'

interface CraftAppIconProps {
  className?: string
  size?: number
}

/**
 * CraftAppIcon - Displays the Craft logo (colorful "C" icon)
 */
export function CraftAppIcon({ className, size = 64 }: CraftAppIconProps) {
  return (
    <div style={{ width: size, height: size }} className={className}>
      <CraftAgentsSymbol className="w-full h-full" />
    </div>
  )
}
