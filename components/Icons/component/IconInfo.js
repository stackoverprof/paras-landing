import React from 'react'
import { iconDefaultProps } from '../IconProps'

const IconInfo = ({ size, color, ...props }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill={color}
		className="inline mb-2"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path
			className="fill-current"
			fill={color}
			fillRule="evenodd"
			clipRule="evenodd"
			d="M1 12C1 18.0751 5.92487 23 12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1C5.92487 1 1 5.92487 1 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM13.0036 13.9983H14.003V15.9983H10.003V13.9983H11.003V11.9983H10.003V9.99835H13.0036V13.9983ZM13.0007 7.99835C13.0007 8.55063 12.5528 8.99835 12.0003 8.99835C11.4479 8.99835 11 8.55063 11 7.99835C11 7.44606 11.4479 6.99835 12.0003 6.99835C12.5528 6.99835 13.0007 7.44606 13.0007 7.99835Z"
		/>
	</svg>
)

IconInfo.defaultProps = {
	...iconDefaultProps,
}

export default IconInfo
