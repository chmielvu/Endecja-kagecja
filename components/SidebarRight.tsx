import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { chatWithAgent } from '../services/geminiService';
import { Send, Cpu, ChevronDown, ChevronRight, MessageSquare, Scroll, PanelRightClose } from 'lucide-react';

export const SidebarRight: React.FC = () => {
  const { messages, addMessage, isThinking, setThinking, graph, isRightSidebarOpen, toggleRightSidebar } = useStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: input, timestamp: Date.now() };
    addMessage(userMsg);
    setInput('');
    setThinking(true);

    try {
      const response = await chatWithAgent(messages, input, graph);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        reasoning: response.reasoning,
        sources: response.sources,
        timestamp: Date.now()
      });
    } catch (e) {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'Error communicating with Dmowski.',
        timestamp: Date.now()
      });
    } finally {
      setThinking(false);
    }
  };

  return (
    <div 
      className={`bg-surface border-l border-archival-gold/20 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative shadow-2xl z-20 ${isRightSidebarOpen ? 'w-[420px]' : 'w-0'}`}
    >
      <div className="w-[420px] h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-archival-gold/20 flex justify-between items-center bg-surface shrink-0">
          <h2 className="text-lg font-bold text-[#e4e4e7] flex items-center gap-2 font-spectral">
            <MessageSquare size={18} className="text-archival-gold" /> Roman Dmowski (1925)
          </h2>
          <div className="flex items-center gap-2">
             <span className="text-[10px] bg-owp-green/10 text-owp-green border border-owp-green/30 px-2 py-0.5 rounded font-mono">PERSONA ACTIVE</span>
             <button onClick={toggleRightSidebar} className="text-zinc-500 hover:text-white transition-colors ml-2"><PanelRightClose size={18}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <ChatMessageItem key={msg.id} msg={msg} />
          ))}
          {isThinking && (
            <div className="flex gap-2 items-start animate-pulse opacity-70">
              <div className="w-8 h-8 rounded-full bg-archival-gold/20 flex items-center justify-center border border-archival-gold/30">
                 <Cpu size={14} className="text-archival-gold" />
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-xs text-zinc-400 font-serif italic border border-zinc-800">
                Dmowski analizuje sytuację geopolityczną...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-archival-gold/20 bg-surface shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Zadaj pytanie Panu Romanowi..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-archival-gold font-serif placeholder:font-sans placeholder:text-zinc-600"
            />
            <button 
              onClick={handleSend}
              disabled={isThinking}
              className="bg-owp-green hover:bg-[#2f5335] text-white p-2 rounded-sm disabled:opacity-50 border border-owp-green"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatMessageItem: React.FC<{ msg: any }> = ({ msg }) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${isUser ? 'bg-owp-green/20 border-owp-green/50' : 'bg-archival-gold/10 border-archival-gold/30'}`}>
        {isUser ? <span className="text-xs text-owp-green font-bold">Ty</span> : <span className="font-serif font-bold text-xs text-archival-gold">RD</span>}
      </div>
      
      <div className={`max-w-[85%] space-y-2`}>
        <div className={`p-3 rounded-sm text-sm break-words whitespace-pre-wrap ${isUser ? 'bg-owp-green/10 text-zinc-200 border border-owp-green/30' : 'bg-zinc-900 text-[#e4e4e7] border border-zinc-800 font-serif'}`}>
          {msg.content}
        </div>

        {/* ReAct Reasoning Dropdown */}
        {!isUser && msg.reasoning && (
           <div className="border border-archival-gold/20 rounded-sm bg-surface overflow-hidden">
             <button 
               onClick={() => setShowReasoning(!showReasoning)}
               className="w-full flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-zinc-900 transition-colors text-xs text-archival-gold"
             >
               {showReasoning ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
               <Scroll size={10} /> Przemyślenia (Chain-of-Thought)
             </button>
             {showReasoning && (
               <div className="p-3 text-xs text-zinc-500 font-mono bg-black/20 whitespace-pre-wrap border-t border-archival-gold/10 break-words">
                 {msg.reasoning}
               </div>
             )}
           </div>
        )}
      </div>
    </div>
  );
};