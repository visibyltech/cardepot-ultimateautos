import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  ExternalLink,
  Headphones,
  Loader2,
  MessageCircle,
  Phone,
  Send,
  UserCheck,
  X,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  buildWhatsAppClickToChatUrl,
  formatNaira,
  formatWhatsAppEnquiryMessage,
  generateReference,
} from '../lib/format';
import { ChatMessage, Vehicle } from '../types';

interface UiChatMessage extends ChatMessage {
  matchedVehicles?: Vehicle[];
}

interface CollectedLead {
  customerName?: string;
  customerPhone?: string;
  enquiryCategory?: string;
  preferredVehicle?: string;
  budgetNgn?: number;
  paymentPreference?: string;
  notes?: string;
  readyToSubmit?: boolean;
}

export function ChatbotWidget() {
  const { user, userProfile, settings, loginWithGoogle } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHandoverPanel, setShowHandoverPanel] = useState(false);
  const [collectedLead, setCollectedLead] = useState<CollectedLead | null>(null);
  const [savedEnquiryRef, setSavedEnquiryRef] = useState<string | null>(null);
  const [waNotifyResult, setWaNotifyResult] = useState<string | null>(null);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [unansweredFlag, setUnansweredFlag] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        text: settings.chatbotWelcomeMessage,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [settings.chatbotWelcomeMessage]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, showHandoverPanel]);

  if (!settings.chatbotEnabled) {
    return null;
  }

  const persistConversation = async (
    nextMessages: UiChatMessage[],
    lead: CollectedLead | null,
    enquiryRef?: string,
    waStatus: 'none' | 'pending' | 'sent' | 'failed' | 'not_configured' = 'none',
    handover = false,
    unanswered = false
  ) => {
    if (!user || !user.emailVerified) return;
    const cleanMessages = nextMessages.slice(-40).map((m) => ({
      role: m.role,
      text: m.text.slice(0, 1500),
      timestamp: m.timestamp,
      matchedVehicleIds: (m.matchedVehicles || []).map((v) => v.id),
    }));

    const payload: Record<string, any> = {
      sessionId,
      userId: user.uid,
      whatsappNotificationStatus: waStatus,
      handoverRequested: handover,
      unansweredFlag: unanswered,
      messages: cleanMessages,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (lead?.customerName) payload.customerName = lead.customerName.slice(0, 120);
    if (lead?.customerPhone) payload.customerPhone = lead.customerPhone.slice(0, 32);
    if (lead?.enquiryCategory) payload.enquiryCategory = lead.enquiryCategory.slice(0, 60);
    if (lead?.preferredVehicle) payload.preferredVehicle = lead.preferredVehicle.slice(0, 160);
    if (typeof lead?.budgetNgn === 'number' && lead.budgetNgn >= 0) {
      payload.budgetNgn = lead.budgetNgn;
    }
    if (lead?.paymentPreference) payload.paymentPreference = lead.paymentPreference.slice(0, 60);
    if (enquiryRef) payload.enquiryReference = enquiryRef;

    const path = `chatConversations/${sessionId}`;
    try {
      await setDoc(doc(db, 'chatConversations', sessionId), payload, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    setError(null);
    const userMsg: UiChatMessage = {
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!overrideText) setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextHistory.slice(0, -1).map((m) => ({ role: m.role, text: m.text })),
          sessionId,
          userId: user?.uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Assistant is currently unavailable.');
      }

      const assistantMsg: UiChatMessage = {
        role: 'assistant',
        text: data.reply,
        timestamp: new Date().toISOString(),
        matchedVehicles: Array.isArray(data.matchedVehicles) ? data.matchedVehicles : [],
      };
      const updatedMessages = [...nextHistory, assistantMsg];
      setMessages(updatedMessages);

      const mergedLead: CollectedLead | null = data.collectedLead
        ? { ...collectedLead, ...data.collectedLead }
        : collectedLead;
      if (mergedLead) setCollectedLead(mergedLead);

      const nextUnanswered = unansweredFlag || Boolean(data.unansweredQuestion);
      setUnansweredFlag(nextUnanswered);

      if (data.needsHumanHandover) {
        setShowHandoverPanel(true);
      }

      if (user && user.emailVerified) {
        await persistConversation(
          updatedMessages,
          mergedLead,
          savedEnquiryRef || undefined,
          'none',
          Boolean(data.needsHumanHandover),
          nextUnanswered
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to reach AI assistant.');
    } finally {
      setSending(false);
    }
  };

  const buildConversationSummary = () => {
    return messages
      .filter((m) => m.role === 'user')
      .slice(-4)
      .map((m) => m.text)
      .join(' | ')
      .slice(0, 450);
  };

  const currentRef = savedEnquiryRef || generateReference('CD');

  const whatsAppHandoverUrl = buildWhatsAppClickToChatUrl(
    formatWhatsAppEnquiryMessage({
      customerName: collectedLead?.customerName || userProfile?.fullName || user?.displayName || 'Website Visitor',
      customerPhone: collectedLead?.customerPhone || userProfile?.phone || '',
      category: collectedLead?.enquiryCategory || 'Car Depot Website Enquiry',
      preferredVehicle: collectedLead?.preferredVehicle,
      budgetNgn: collectedLead?.budgetNgn,
      paymentPreference: collectedLead?.paymentPreference,
      enquiryReference: currentRef,
      questions: collectedLead?.notes,
      summary: buildConversationSummary(),
    }),
    settings.whatsappNumber
  );

  const handleSaveEnquiryAndNotify = async () => {
    setSubmittingLead(true);
    setWaNotifyResult(null);
    const refCode = savedEnquiryRef || generateReference('CD');

    try {
      const category = (
        ['car_purchase', 'financing', 'save_to_own', 'sell_car', 'quotation', 'inspection', 'general'].includes(
          String(collectedLead?.enquiryCategory)
        )
          ? collectedLead?.enquiryCategory
          : 'general'
      ) as any;

      const summary = buildConversationSummary() || 'Customer enquiry from Car Depot AI Assistant';

      // Call server WhatsApp Business API notification if configured
      const notifyRes = await fetch('/api/whatsapp/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiryReference: refCode,
          customerName:
            collectedLead?.customerName || userProfile?.fullName || user?.displayName || 'Website Customer',
          customerPhone: collectedLead?.customerPhone || userProfile?.phone || 'Not provided',
          category,
          preferredVehicle: collectedLead?.preferredVehicle,
          budgetNgn: collectedLead?.budgetNgn,
          paymentPreference: collectedLead?.paymentPreference,
          message: summary,
        }),
      });
      const notifyData = await notifyRes.json();
      const waStatus = notifyData.status || 'not_configured';

      if (user && user.emailVerified) {
        const enquiryId = `enq_${Date.now()}`;
        const enquiryPath = `enquiries/${enquiryId}`;
        try {
          await setDoc(doc(db, 'enquiries', enquiryId), {
            referenceNumber: refCode,
            userId: user.uid,
            customerName:
              collectedLead?.customerName || userProfile?.fullName || user.displayName || 'Customer',
            customerPhone: collectedLead?.customerPhone || userProfile?.phone || 'Via Chat',
            customerEmail: user.email || '',
            vehicleName: collectedLead?.preferredVehicle || '',
            category,
            budgetNgn: Number(collectedLead?.budgetNgn || 0),
            paymentPreference: collectedLead?.paymentPreference || '',
            message: summary,
            source: 'chatbot',
            status: 'new',
            whatsappNotificationStatus: waStatus,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, enquiryPath);
        }

        await persistConversation(messages, collectedLead, refCode, waStatus, true, unansweredFlag);
      }

      setSavedEnquiryRef(refCode);
      setWaNotifyResult(
        notifyData.delivered
          ? `Enquiry ${refCode} logged and automated dealership WhatsApp alert delivered.`
          : `Enquiry reference ${refCode} prepared. Click "Send Enquiry to WhatsApp" below to open WhatsApp with your pre-filled message.`
      );
    } catch (err: any) {
      setWaNotifyResult(err?.message || 'Saved reference locally. Use WhatsApp button below to message sales.');
    } finally {
      setSubmittingLead(false);
    }
  };

  return (
    <>
      {/* Floating Chat Launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Car Depot AI Assistant"
          className="fixed bottom-16 md:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 bg-[#0B0D10] hover:bg-slate-900 text-white px-4 py-3 rounded-full shadow-xl border border-slate-700 transition-transform active:scale-95"
        >
          <span className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </span>
          <span className="text-xs sm:text-sm font-semibold whitespace-nowrap pr-1">
            Ask Car Depot AI
          </span>
        </button>
      )}

      {/* Chat Drawer / Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={settings.chatbotName}
          className="fixed inset-x-2 bottom-16 md:bottom-6 md:right-6 md:left-auto z-50 md:w-[410px] h-[72vh] max-h-[600px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-[#0B0D10] text-white px-4 py-3 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm truncate">
                  {settings.chatbotName}
                </h3>
                <p className="text-[11px] text-slate-400 truncate">
                  Live Inventory &amp; Dealership Support
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowHandoverPanel((v) => !v)}
                title="Talk to Our Sales Team"
                className="min-h-[40px] px-2.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 whitespace-nowrap"
              >
                <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                Sales Team
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Human Handover / WhatsApp Action Strip */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
            <a
              href={whatsAppHandoverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Send Enquiry to WhatsApp
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={() => setShowHandoverPanel((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-semibold rounded-lg whitespace-nowrap shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5 text-red-600" />
              Talk to Our Sales Team
            </button>
          </div>

          {/* Human Handover Panel */}
          {showHandoverPanel && (
            <div className="bg-slate-900 text-white p-3.5 border-b border-slate-800 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Human Sales Representative Handover</p>
                <button
                  type="button"
                  onClick={() => setShowHandoverPanel(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Hide
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={whatsAppHandoverUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp Sales
                </a>
                <a
                  href={`tel:${settings.phoneNumber.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Dealership
                </a>
              </div>
              <button
                type="button"
                onClick={handleSaveEnquiryAndNotify}
                disabled={submittingLead}
                className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg"
              >
                {submittingLead ? 'Logging Enquiry...' : 'Log Enquiry & Generate Reference Number'}
              </button>
              {!user && (
                <button
                  type="button"
                  onClick={() => loginWithGoogle()}
                  className="w-full py-1.5 text-[11px] text-slate-300 underline hover:text-white"
                >
                  Sign in with Google to save chat history to your dashboard
                </button>
              )}
              {waNotifyResult && (
                <p className="text-[11px] text-emerald-300 bg-emerald-950/60 border border-emerald-800 rounded p-2">
                  {waNotifyResult}
                </p>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0B0D10] text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Matched Live Inventory Cards */}
                {msg.matchedVehicles && msg.matchedVehicles.length > 0 && (
                  <div className="mt-2 w-[90%] space-y-2">
                    {msg.matchedVehicles.map((v) => (
                      <Link
                        key={v.id}
                        to={`/cars/${v.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 hover:border-red-500 rounded-xl transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {v.year} {v.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {v.condition} · {v.transmission} · {v.location}
                          </p>
                        </div>
                        <span className="font-mono-num text-xs font-bold text-red-600 shrink-0">
                          {formatNaira(v.priceNgn)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {collectedLead?.readyToSubmit && !savedEnquiryRef && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-900">
                  Your enquiry details are ready to submit:
                </p>
                <p className="text-[11px] text-slate-600">
                  {collectedLead.customerName} · {collectedLead.customerPhone}
                  {collectedLead.preferredVehicle ? ` · ${collectedLead.preferredVehicle}` : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEnquiryAndNotify}
                    disabled={submittingLead}
                    className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
                  >
                    {submittingLead ? 'Saving...' : 'Generate Ref & Submit'}
                  </button>
                  <a
                    href={whatsAppHandoverUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg text-center"
                  >
                    Open WhatsApp
                  </a>
                </div>
              </div>
            )}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                Checking live Car Depot inventory...
              </div>
            )}

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips (only on initial state) */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto shrink-0">
              {[
                'What cars are available now?',
                'Can I buy a car on installment?',
                'How does Save to Own work?',
                'I want to sell my car',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(undefined, prompt)}
                  className="px-2.5 py-1.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg whitespace-nowrap shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about cars, financing, Save to Own..."
              className="flex-1 px-3 py-2.5 text-sm bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="min-h-[42px] min-w-[42px] bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
