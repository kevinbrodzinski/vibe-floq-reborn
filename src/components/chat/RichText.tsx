import React from 'react';

interface RichTextProps {
  text: string;
}

export const RichText: React.FC<RichTextProps> = ({ text }) => {
  return (
    <>
      {text.split(/(@[\w._-]{2,32})/g).map((part, index) =>
        part.startsWith('@') ? (
          <span key={index} className="text-primary font-medium">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
};