import { Target } from 'lucide-react';
import type { CanDo } from '../types/curriculum';
import { canDoSkillLabel, formatCanDoStatement } from '../utils/dialogueDisplay';

interface CanDoPanelProps {
  language: 'en' | 'it';
  canDo: CanDo[];
}

export function CanDoPanel({ language, canDo }: CanDoPanelProps) {
  if (canDo.length === 0) return null;

  return (
    <section className="cando-panel glass-panel">
      <h3 className="cando-panel-heading">
        <Target size={18} />
        {language === 'en' ? 'Can-do goals' : 'Obiettivi Can-do'}
      </h3>
      <ul className="cando-list">
        {canDo.map((item, index) => (
          <li key={item.id ?? `cando-${index}`} className="cando-item">
            <span className="cando-statement">{formatCanDoStatement(item, language)}</span>
            {(item.level || item.skill) && (
              <span className="cando-meta">
                {[item.level, item.skill ? canDoSkillLabel(item.skill, language) : '']
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
