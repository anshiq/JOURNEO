import * as React from 'react'
import type { StyleConfigProps } from '../_core/config'
import { ColorFieldWithHex, TextField, SelectField, SegmentedControl, NumberField } from '../_core/styleWidgets'
export const DividerStyleConfig: React.FC<StyleConfigProps> = ({ style, onChange, theme }) => {
  return <div className="space-y-4"><ColorFieldWithHex label="Background" value={style.backgroundColor} onChange={v => onChange('backgroundColor', v)} /><ColorFieldWithHex label="Text" value={style.foregroundColor} onChange={v => onChange('foregroundColor', v)} /><ColorFieldWithHex label="Border" value={style.borderColor} onChange={v => onChange('borderColor', v)} />
<div className="grid grid-cols-2 gap-2"><TextField label="Width" value={style.width} onChange={v => onChange('width', v)} placeholder="auto · ≤100%" /><TextField label="Height" value={style.height} onChange={v => onChange('height', v)} placeholder="auto" /></div>
</div>
}
export default DividerStyleConfig
