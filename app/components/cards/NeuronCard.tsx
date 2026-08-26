import { type HTMLAttributes } from "react";

type NeuronCardProps = HTMLAttributes<HTMLDivElement>;

export function NeuronCard({
    children,
    ...props
} : NeuronCardProps) {
    return (
        <div className="mx-auto p-4 rounded-2xl w-[90%] min-h-20 bg-card/70 text-neutral-300" {...props}>
            {children}
        </div>
    );
};