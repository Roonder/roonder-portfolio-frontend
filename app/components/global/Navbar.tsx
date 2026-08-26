import { type HTMLAttributes } from "react";
// Components
import { Menu } from "lucide-react";

type NavbarProps = HTMLAttributes<HTMLDivElement>;

export function Navbar({ ...props }: NavbarProps) {
	return (
		<header
			className="@container w-full px-6 py-3.5 flex items-center-safe justify-between text-white font-semibold text-2xl border-b @md:border-none border-b-outline-variant/35"
			{...props}
		>
			<h1 className="text-primary">Juliam A.</h1>
			<Menu />
		</header>
	);
}
