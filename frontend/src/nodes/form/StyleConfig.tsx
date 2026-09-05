import * as React from 'react'
import type { StyleConfigProps } from '../_core/config'
import { ColorFieldWithHex, TextField, SelectField, SegmentedControl, NumberField } from '../_core/styleWidgets'
export const FormStyleConfig: React.FC<StyleConfigProps> = ({ style, onChange, theme }) => {
  return <div className="space-y-4"><ColorFieldWithHex label="Background" value={style.backgroundColor} onChange={v => onChange('backgroundColor', v)} /><ColorFieldWithHex label="Text" value={style.foregroundColor} onChange={v => onChange('foregroundColor', v)} /><ColorFieldWithHex label="Border" value={style.borderColor} onChange={v => onChange('borderColor', v)} />
<TextField label="Radius" value={style.borderRadius} onChange={v => onChange('borderRadius', v)} placeholder="8px" /><SelectField label="Style" value={style.borderStyle} onChange={v => onChange('borderStyle', v)} options={[{value:'solid',label:'Solid'},{value:'dashed',label:'Dashed'},{value:'none',label:'None'}]} /><TextField label="Width" value={style.borderWidth} onChange={v => onChange('borderWidth', v)} placeholder="1px" />
<TextField label="Padding" value={style.padding} onChange={v => onChange('padding', v)} placeholder="12px" /><TextField label="Gap" value={style.gap} onChange={v => onChange('gap', v)} placeholder="8px" />
</div>
}
export default FormStyleConfig
