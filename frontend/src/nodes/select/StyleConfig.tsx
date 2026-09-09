import * as React from 'react'
import type { StyleConfigProps } from '../_core/config'
import { ColorFieldWithHex, TextField, SelectField, SegmentedControl, NumberField } from '../_core/styleWidgets'
export const SelectStyleConfig: React.FC<StyleConfigProps> = ({ style, onChange, theme }) => {
  return <div className="space-y-4"><ColorFieldWithHex label="Background" value={style.backgroundColor} onChange={v => onChange('backgroundColor', v)} /><ColorFieldWithHex label="Text" value={style.foregroundColor} onChange={v => onChange('foregroundColor', v)} /><ColorFieldWithHex label="Border" value={style.borderColor} onChange={v => onChange('borderColor', v)} />
<SelectField label="Font" value={style.fontFamily} onChange={v => onChange('fontFamily', v)} options={[{value:'Inter',label:'Inter'},{value:'system-ui',label:'System'},{value:'Georgia',label:'Georgia'}]} /><SelectField label="Weight" value={style.fontWeight} onChange={v => onChange('fontWeight', v)} options={[{value:'300',label:'Light'},{value:'400',label:'Regular'},{value:'600',label:'Semibold'},{value:'700',label:'Bold'}]} /><TextField label="Font size" value={style.fontSize} onChange={v => onChange('fontSize', v)} placeholder="14px" /><SegmentedControl label="Align" value={style.textAlign} onChange={v => onChange('textAlign', v)} options={[{value:'left',label:'Left'},{value:'center',label:'Center'},{value:'right',label:'Right'}]} />
<TextField label="Radius" value={style.borderRadius} onChange={v => onChange('borderRadius', v)} placeholder="8px" /><SelectField label="Style" value={style.borderStyle} onChange={v => onChange('borderStyle', v)} options={[{value:'solid',label:'Solid'},{value:'dashed',label:'Dashed'},{value:'none',label:'None'}]} /><TextField label="Width" value={style.borderWidth} onChange={v => onChange('borderWidth', v)} placeholder="1px" />
<TextField label="Padding" value={style.padding} onChange={v => onChange('padding', v)} placeholder="12px" /><TextField label="Gap" value={style.gap} onChange={v => onChange('gap', v)} placeholder="8px" />
<div className="grid grid-cols-2 gap-2"><TextField label="Width" value={style.width} onChange={v => onChange('width', v)} placeholder="auto · ≤100%" /><TextField label="Height" value={style.height} onChange={v => onChange('height', v)} placeholder="auto" /></div>
</div>
}
export default SelectStyleConfig
