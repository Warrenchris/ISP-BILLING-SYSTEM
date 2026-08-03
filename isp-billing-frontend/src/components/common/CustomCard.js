import React from 'react';

const CustomCard = ({ children, className = '', ...props }) => {
    return (
        <div
            className={`
                relative overflow-hidden transition-shadow duration-150 ease-out
                rounded-[20px] border border-[rgba(28,25,23,0.06)] bg-white
                shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]
                hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]
                ${className}
            `}
            {...props}
        >
            {children}
        </div>
    );
};

export default CustomCard;
