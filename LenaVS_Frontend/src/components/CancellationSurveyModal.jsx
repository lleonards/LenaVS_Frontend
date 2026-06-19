import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './CancellationSurveyModal.css';

const CANCELLATION_REASONS = [
  { value: 'not_found', label: 'Não encontrei o que precisava' },
  { value: 'difficult_to_use', label: 'A plataforma é difícil de usar' },
  { value: 'alternative_tool', label: 'Encontrei outra ferramenta' },
  { value: 'technical_issues', label: 'Problemas técnicos' },
  { value: 'price', label: 'Preço' },
  { value: 'no_longer_use', label: 'Não utilizo mais a plataforma' },
  { value: 'other', label: 'Outro' },
];

const FEEDBACK_PROMPTS = {
  not_found: 'O que você estava procurando e não encontrou?',
  difficult_to_use: 'Como podemos melhorar sua experiência?',
  technical_issues: 'Quais problemas você encontrou?',
  price: 'O que tornaria o plano mais interessante para você?',
  other: 'Conte-nos mais',
};

const CancellationSurveyModal = () => {
  const { cancellationSurveyPending, submitCancellationFeedback } = useAuth();
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!cancellationSurveyPending) return null;

  const feedbackPrompt = FEEDBACK_PROMPTS[reason] || null;

  const handleDismiss = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await submitCancellationFeedback({ dismissed: true });
    } catch (err) {
      console.warn('Erro ao dispensar pesquisa de cancelamento:', err?.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!reason) {
      window.alert('Por favor, selecione um motivo para continuar.');
      return;
    }

    try {
      setSubmitting(true);
      await submitCancellationFeedback({ reason, feedback, dismissed: false });
      setSubmitted(true);
      setTimeout(() => {
        submitCancellationFeedback({ dismissed: true }).catch(() => {});
      }, 2000);
    } catch (err) {
      console.error('Erro ao enviar feedback de cancelamento:', err?.message);
      window.alert('Não foi possível enviar o feedback. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cs-overlay" onClick={!submitting ? handleDismiss : undefined}>
      <div
        className="cs-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cs-modal-title"
      >
        <div className="cs-modal__header">
          <div>
            <h3 id="cs-modal-title" className="cs-modal__title">Cancelamento de Assinatura</h3>
            <p className="cs-modal__subtitle">
              {submitted
                ? 'Obrigado pelo seu feedback!'
                : 'Sentimos muito que você cancelou. Seu feedback nos ajuda a melhorar a LenaVS.'}
            </p>
          </div>

          <button
            type="button"
            className="cs-close-btn"
            onClick={handleDismiss}
            disabled={submitting}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="cs-modal__body">
            <div className="cs-success-message">
              <p>Sua resposta foi registrada. Obrigado por ajudar a melhorar a LenaVS.</p>
            </div>
          </div>
        ) : (
          <form className="cs-modal__body" onSubmit={handleSubmit}>
            <div className="cs-section-heading">
              <strong>Por que você cancelou sua assinatura?</strong>
              <span>Sua resposta é opcional, mas muito valiosa para nós.</span>
            </div>

            <div className="cs-reason-list" role="radiogroup" aria-label="Motivo do cancelamento">
              {CANCELLATION_REASONS.map((option) => {
                const isSelected = reason === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`cs-reason-option${isSelected ? ' cs-reason-option--selected' : ''}`}
                    onClick={() => {
                      setReason(option.value);
                      setFeedback('');
                    }}
                    aria-pressed={isSelected}
                    disabled={submitting}
                  >
                    <span className="cs-reason-marker" aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            {feedbackPrompt ? (
              <label className="cs-field">
                <span>{feedbackPrompt}</span>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Feedback opcional"
                  maxLength={1200}
                  rows={4}
                  disabled={submitting}
                />
              </label>
            ) : null}

            <div className="cs-modal__footer">
              <button
                type="button"
                className="cs-ghost-btn"
                onClick={handleDismiss}
                disabled={submitting}
              >
                Pular
              </button>

              <button
                type="submit"
                className="cs-primary-btn"
                disabled={submitting || !reason}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="cs-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar feedback'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CancellationSurveyModal;
