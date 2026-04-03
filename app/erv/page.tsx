'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { TapCardGrid } from '@/components/agent-tap-cards';
import { AIToolRenderer } from '@/components/ai-tool-renderer';

type Step = 'who' | 'what' | 'chat';
type FlowType = 'survivor' | 'donor' | 'volunteer';
type ForWhom = 'myself' | 'someone';

const ERV_SYSTEM_PROMPTS: Record<FlowType, string> = {
  survivor: `You are the EmergencyRV intake agent. You help disaster survivors apply for temporary RV housing.

CONTEXT: EmergencyRV provides fully equipped RVs to veterans, first responders, and families displaced by natural disasters. Staging location: Ocala, FL.

PRIORITY GROUPS: Veterans (+25 priority), First responders (+25), Single parents with children (+20), Medical conditions (+15), Families with children (+10), Elderly (+10).

INTAKE FLOW — collect these ONE question at a time:
1. "What disaster caused you to lose or damage your home?" (show chips: Hurricane, Tornado, Wildfire, Flood, Fire, Other)
2. "Are you a veteran or first responder?" (show chips: Veteran, First Responder, Both, Neither) — if yes, follow up on branch/type
3. "Do you have any medical conditions or accessibility needs? Especially trouble with stairs." (Yes/No chip, then free text)
4. "Are you a single parent?" (Yes/No chip)
5. "How many people in your household? Tell me their ages." (number + free text)
6. "Did you rent or own your home?" (Rent/Own chip)
7. "Do you have homeowner's or renter's insurance?" (Yes/No chip)
8. "How long will you need the RV?" (chips: Less than 6 months, 6-12 months, 1-2 years, 2+ years)
9. Confirm location (use provided location or ask for address)
10. "Anything else you'd like us to consider?"
11. Summarize and submit via intake-write

RULES:
- ONE question at a time. Never stack questions.
- Use chips for structured answers, free text for details.
- Be warm but efficient. These people are in crisis.
- After collecting all info, call submit_sos to create the request.
- Never ask for SSN, bank info, or credit cards.`,

  donor: `You are the EmergencyRV intake agent. You help people donate their RVs to disaster survivors.

CONTEXT: EmergencyRV accepts 5th wheels, motorhomes, teardrops, travel trailers, toy haulers, and sprinter vans in good working condition. Your donation provides shelter for a family.

INTAKE FLOW — collect these ONE question at a time:
1. "What type of RV would you like to donate?" (chips: Travel Trailer, 5th Wheel, Motorhome, Pop-up/Tent, Toy Hauler, Other)
2. "What year, make, and model is it?" (free text)
3. "How many people can it sleep comfortably?" (number)
4. "Where is the RV located right now?" (address/location)
5. "What condition is it in? Any repairs needed?" (free text — mention tires, batteries, leaks, propane, roof)
6. "Can you deliver it, or do you need EmergencyRV to arrange pickup?" (chips: I can deliver, Need pickup, Depends on distance)
7. "Do you have the VIN number?" (free text — mention it helps with title and tax paperwork)
8. "Would you like your donation to go to a specific group? Veterans, single parents, first responders, or anyone in need?" (chips + free text)
9. "For tax purposes: your full name and address for the donation letter?"
10. Summarize and submit via intake-write with intent=donate

RULES:
- Be grateful. Every RV changes a family's life.
- ONE question at a time.
- Don't make VIN mandatory — ask but accept "I'll get it later."
- After collecting all info, call submit_sos to create the resource.`,

  volunteer: `You are the EmergencyRV intake agent. You help people volunteer with EmergencyRV, especially as drivers.

CONTEXT: EmergencyRV needs volunteer drivers to transport RVs from staging areas (Ocala, FL) to disaster survivors. Drivers are the biggest bottleneck.

INTAKE FLOW — collect these ONE question at a time:
1. "How would you like to help?" (chips: Drive/Tow RVs, Social Media/Marketing, Admin/Data Entry, Fundraising, General Help)
2. If driver: "Can you tow an RV? What vehicle do you have?" (free text — need make/model, hitch type: bumper pull, 5th wheel, gooseneck)
3. If driver: "Do you have experience driving a Class A motorhome?" (Yes/No chip)
4. "What state are you in?" (free text or location share)
5. "What hours/days are you typically available?" (free text)
6. "Any previous volunteer or disaster response experience?" (free text)
7. Contact info: name, email, phone
8. Summarize and submit

RULES:
- ONE question at a time.
- If they can tow: get vehicle specs (this matters for matching RV type to driver).
- Be enthusiastic — volunteers make ERV possible.
- After collecting all info, call submit_sos to create the volunteer record.`,
};

export default function ErvIntakePage() {
  const [step, setStep] = useState<Step>('who');
  const [forWhom, setForWhom] = useState<ForWhom | null>(null);
  const [flowType, setFlowType] = useState<FlowType | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  const transport = useRef(new DefaultChatTransport({
    api: '/api/chat',
    headers: {
      'x-person-id': personId || '',
      'x-authenticated': personId ? 'true' : 'false',
    },
  })).current;

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === 'streaming' || status === 'submitted';

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Start the agent conversation when flow is selected
  useEffect(() => {
    if (step === 'chat' && flowType && forWhom && messages.length === 0) {
      const context = forWhom === 'myself' 
        ? 'The user is filling this out for themselves.'
        : 'The user is filling this out on behalf of someone else. Ask for the beneficiary\'s information separately.';
      
      sendMessage({ text: `[ERV_INTAKE:${flowType}:${forWhom}] ${context}. Start the intake flow.` });
    }
  }, [step, flowType, forWhom]);

  function selectForWhom(whom: ForWhom) {
    setForWhom(whom);
    setStep('what');
  }

  function selectFlow(flow: FlowType) {
    setFlowType(flow);
    setStep('chat');
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  }

  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-lg">
            🚐
          </div>
          <div>
            <h1 className="text-sm font-bold">EmergencyRV</h1>
            <p className="text-[10px] text-white/40">Bridging the Gap Between Disaster and Safe Shelter</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Step 0: For whom? */}
        {step === 'who' && (
          <div className="px-4 py-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Welcome to EmergencyRV</h2>
              <p className="text-sm text-white/50">We provide RVs to families displaced by natural disasters.</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-white/40 text-center">Who is this for?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => selectForWhom('myself')}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center space-y-2"
                >
                  <span className="text-2xl">🙋</span>
                  <p className="text-sm font-semibold">For myself</p>
                  <p className="text-[10px] text-white/40">I need help or want to donate/volunteer</p>
                </button>
                <button
                  onClick={() => selectForWhom('someone')}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center space-y-2"
                >
                  <span className="text-2xl">🤝</span>
                  <p className="text-sm font-semibold">For someone else</p>
                  <p className="text-[10px] text-white/40">I&apos;m a partner, case worker, or friend</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: What do you need? */}
        {step === 'what' && (
          <div className="px-4 py-8 space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs text-white/40">
                {forWhom === 'myself' ? 'How can we help you?' : 'How can we help them?'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => selectFlow('survivor')}
                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-4"
              >
                <span className="text-3xl">🆘</span>
                <div className="text-left">
                  <p className="text-sm font-semibold">I need housing help</p>
                  <p className="text-[10px] text-white/40">Lost or damaged home due to a natural disaster</p>
                </div>
              </button>

              <button
                onClick={() => selectFlow('donor')}
                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-4"
              >
                <span className="text-3xl">🚐</span>
                <div className="text-left">
                  <p className="text-sm font-semibold">I want to donate an RV</p>
                  <p className="text-[10px] text-white/40">Give an RV to a family in need</p>
                </div>
              </button>

              <button
                onClick={() => selectFlow('volunteer')}
                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-4"
              >
                <span className="text-3xl">🤝</span>
                <div className="text-left">
                  <p className="text-sm font-semibold">I want to volunteer or drive</p>
                  <p className="text-[10px] text-white/40">Help deliver RVs or support operations</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => { setStep('who'); setForWhom(null); }}
              className="w-full text-center text-[10px] text-white/30 hover:text-white/50"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 2: Agent Chat */}
        {step === 'chat' && (
          <div className="flex flex-col h-full">
            {/* Flow indicator */}
            <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {flowType === 'survivor' ? '🆘' : flowType === 'donor' ? '🚐' : '🤝'}
                </span>
                <span className="text-[10px] text-white/50">
                  {flowType === 'survivor' ? 'Housing Application' : flowType === 'donor' ? 'RV Donation' : 'Volunteer Signup'}
                  {forWhom === 'someone' ? ' (on behalf of someone)' : ''}
                </span>
              </div>
              <button
                onClick={() => { setStep('what'); setFlowType(null); }}
                className="text-[10px] text-white/30 hover:text-white/50"
              >
                ← Change
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={msg.id || i}>
                  {(msg as any).parts?.map((part: any, j: number) => {
                    // Skip system messages
                    if (part.type === 'text' && part.text?.startsWith('[System:')) return null;
                    
                    if (part.type === 'tool-invocation' && part.toolInvocation?.result) {
                      try {
                        const result = typeof part.toolInvocation.result === 'string' ? JSON.parse(part.toolInvocation.result) : part.toolInvocation.result;
                        return <div key={j} className="mb-1"><AIToolRenderer toolData={result} onUserAction={(text: string) => sendMessage({ text })} /></div>;
                      } catch { return null; }
                    }
                    if (part.type === 'text' && part.text) {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={j} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
                          <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                            isUser
                              ? 'bg-[#89CFF0] text-[#0F1E2B] rounded-br-md'
                              : 'bg-white/10 text-white rounded-bl-md'
                          }`}>
                            <span>{part.text}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input bar (only in chat step) */}
      {step === 'chat' && (
        <form onSubmit={handleSend} className="px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] border-t border-white/10 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your answer..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-[#89CFF0] flex items-center justify-center disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F1E2B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}
