import type { SVGProps } from "react";

export function CaretLeftIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		>
			<path d="M10 3L5 8l5 5" />
		</svg>
	);
}
