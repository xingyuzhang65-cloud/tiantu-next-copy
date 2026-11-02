import { HelpCircle } from 'lucide-react';
import './HeaderHelpEntry.css';

type HeaderHelpEntryProps = {
  href: string;
};

export default function HeaderHelpEntry({ href }: HeaderHelpEntryProps) {
  return (
    <a className="header-help-entry" href={href} target="_blank" rel="noopener noreferrer">
      <HelpCircle size={20} strokeWidth={1.8} aria-hidden="true" />
      <span>帮助中心</span>
    </a>
  );
}
