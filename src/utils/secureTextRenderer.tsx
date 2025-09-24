import React from 'react';
import DOMPurify from 'dompurify';
import { renderMentions } from './mentions';
import { Link } from 'react-router-dom';

/**
 * Secure text renderer that prevents XSS attacks
 * Use this instead of dangerouslySetInnerHTML
 */

interface SecureTextProps {
  text: string;
  className?: string;
  allowMentions?: boolean;
}

export const SecureText: React.FC<SecureTextProps> = ({ 
  text, 
  className = '',
  allowMentions = false 
}) => {
  if (allowMentions) {
    // Use the safe mention renderer from utils/mentions.ts
    const renderedContent = renderMentions(text, (handle) => (
      <Link
        to={`/u/${handle}`}
        className="text-primary/80 font-medium cursor-pointer hover:underline"
      >
        @{handle}
      </Link>
    ));
    
    return <span className={className}>{renderedContent}</span>;
  }

  // For plain text, just render safely
  return <span className={className}>{text}</span>;
};

/**
 * Secure HTML renderer with DOMPurify sanitization
 * Only use when you absolutely need HTML content from trusted sources
 */
interface SecureHTMLProps {
  html: string;
  className?: string;
  allowedTags?: string[];
}

export const SecureHTML: React.FC<SecureHTMLProps> = ({ 
  html, 
  className = '',
  allowedTags = ['b', 'strong', 'i', 'em', 'span']
}) => {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ['class'], // Only allow class attributes
    KEEP_CONTENT: true,
  });

  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

/**
 * Helper function to safely bold text entities
 * Returns JSX elements instead of HTML strings
 */
export const secureBoldify = (text: string, entities: { [key: string]: string }) => {
  let parts: (string | JSX.Element)[] = [text];

  Object.entries(entities).forEach(([key, value]) => {
    if (!value) return;
    
    parts = parts.flatMap((part, index) => {
      if (typeof part !== 'string') return part;
      
      const regex = new RegExp(`(${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const segments = part.split(regex);
      
      return segments.map((segment, segIndex) => {
        if (regex.test(segment)) {
          return <strong key={`${index}-${segIndex}`}>{segment}</strong>;
        }
        return segment;
      });
    });
  });

  return parts.filter(part => part !== '');
};