
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { chatWithAgent } from '../services/geminiService';
import { Send, Cpu, ChevronDown, ChevronRight, MessageSquare, Scroll, PanelRightClose, Search, GitCommit, ExternalLink } from 'lucide-react';
import { DossierPanel } from './DossierPanel';
import { BakeliteInput } from './BakeliteInput';
import { BakeliteButton } from './BakeliteButton';
import { ManualCreator } from './ManualCreator';
import { ChatMessage } from '../types';

export const SidebarRight: React.FC = () => {
  const { messages, addMessage, isThinking, setThinking, graph, isRightSidebarOpen, toggleRightSidebar, selectedNodeIds } = useStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedNode = selectedNodeIds.length === 1 
      ? graph.nodes.find(n => n.data.id === selectedNodeIds[0])?.data 
      : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
     if (!selectedNode) scrollToBottom();
  }, [messages, isThinking, selectedNode]);

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
        toolCalls: response.toolCalls,
        timestamp: Date.now()
      });

      if (response.patch) {
          useStore.getState().setPendingPatch(response.patch);
          useStore.getState().addToast({
             title: "Graph Updates Proposed",
             description: "Dmowski has drafted new entities based on research.",
             type: "success"
          });
      }

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
      className={`bg-deco-panel border-l border-deco-gold/20 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative shadow-2xl z-20 ${isRightSidebarOpen ? 'w-[420px]' : 'w-0'}`}
    >
      <div className="w-[420px] h-full flex flex-col">
        {selectedNode ? (
            <DossierPanel node={selectedNode} />
        ) : (
            <>
                <div className="p-4 border-b border-deco-gold/20 flex justify-between items-center bg-deco-panel/90 shrink-0">
                  <h2 className="text-lg font-bold text-deco-paper flex items-center gap-2 font-spectral">
                    <MessageSquare size={18} className="text-deco-gold" /> Roman Dmowski (1925)
                  </h2>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] bg-deco-green/10 text-deco-green border border-deco-green/30 px-2 py-0.5 rounded font-mono">PERSONA ACTIVE</span>
                     <BakeliteButton onClick={toggleRightSidebar} icon={<PanelRightClose size={18}/>} className="!p-1 !px-2 ml-2" variant="secondary"><span className="sr-only">Toggle Sidebar</span></BakeliteButton>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-owp-texture">
                  {messages.map((msg) => (
                    <ChatMessageItem key={msg.id} msg={msg} />
                  ))}
                  {isThinking && (
                    <div className="flex gap-2 items-start animate-pulse opacity-70">
                      <div className="w-8 h-8 rounded-full bg-deco-gold/20 flex items-center justify-center border border-deco-gold/30">
                         <Cpu size={14} className="text-deco-gold" />
                      </div>
                      <div className="bg-deco-panel rounded-lg p-3 text-xs text-zinc-400 font-serif italic border border-deco-gold/20">
                        Dmowski analizuje sytuację geopolityczną...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-deco-gold/20 bg-deco-panel shrink-0">
                  <div className="flex gap-2">
                    <BakeliteInput
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Zadaj pytanie Panu Romanowi..."
                      className="flex-1"
                    />
                    <BakeliteButton 
                      onClick={handleSend}
                      disabled={isThinking}
                      className="bg-deco-green hover:bg-deco-green/80 text-deco-paper p-2 rounded-sm disabled:opacity-50 border border-deco-green"
                      icon={<Send size={16} />}
                      variant="primary"
                    >
                      <span className="sr-only">Send</span>
                    </BakeliteButton>
                  </div>
                </div>
            </>
        )}
        <ManualCreator />
      </div>
    </div>
  );
};

const ChatMessageItem: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const isUser = msg.role === 'user';
  const hasTools = (msg.toolCalls && msg.toolCalls.length > 0) || (msg.sources && msg.sources.length > 0);

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${isUser ? 'bg-deco-green/20 border-deco-green/50' : 'bg-deco-gold/10 border-deco-gold/30'}`}>
        {isUser ? <span className="text-xs text-deco-green font-bold">Ty</span> : <span className="font-serif font-bold text-xs text-deco-gold">RD</span>}
      </div>
      
      <div className={`max-w-[85%] space-y-2`}>
        <div className={`p-3 rounded-sm text-sm break-words whitespace-pre-wrap ${isUser ? 'bg-deco-green/10 text-deco-paper border border-deco-green/30' : 'bg-deco-panel text-deco-paper border border-deco-gold/20 font-serif'}`}>
          {msg.content}
        </div>

        {!isUser && hasTools && (
          <div className="border border-deco-gold/20 rounded-sm bg-deco-panel overflow-hidden">
            <BakeliteButton 
              onClick={() => setShowSources(!showSources)}
              className="w-full justify-start !px-3 !py-1.5"
              variant="secondary"
              icon={showSources ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
            >
              {(msg.toolCalls && msg.toolCalls.length > 0) ? <GitCommit size={10} /> : <Search size={10} />}
              {msg.toolCalls && msg.toolCalls.length > 0 ? 'Agent Tool Call' : 'Google Search Used'}
            </BakeliteButton>
            {showSources && (
              <div className="p-3 text-xs text-zinc-500 font-mono bg-deco-navy/20 whitespace-pre-wrap border-t border-deco-gold/10 break-words">
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <>
                    <p className="font-bold text-deco-gold mb-1">Tools Used:</p>
                    <ul className="list-disc list-inside space-y-0.5 mb-2">
                      {msg.toolCalls.map((call, idx) => (
                        <li key={idx} className="text-zinc-400">{call.name}</li>
                      ))}
                    </ul>
                  </>
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <>
                    <p className="font-bold text-deco-gold mb-1">Sources:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {msg.sources.map((source, idx) => (
                        <li key={idx}>
                          <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-deco-green hover:underline flex items-center gap-1">
                            {source.label || source.uri} <ExternalLink size={10} />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {!isUser && msg.reasoning && (
           <div className="border border-deco-gold/20 rounded-sm bg-deco-panel overflow-hidden">
             <BakeliteButton 
               onClick={() => setShowReasoning(!showReasoning)}
               className="w-full justify-start !px-3 !py-1.5"
               variant="secondary"
               icon={showReasoning ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
             >
               <Scroll size={10} /> Przemyślenia (Chain-of-Thought)
             </BakeliteButton>
             {showReasoning && (
               <div className="p-3 text-xs text-zinc-500 font-mono bg-deco-navy/20 whitespace-pre-wrap border-t border-deco-gold/10 break-words">
                 {msg.reasoning}
               </div>
             )}
           </div>
        )}
      </div>
    </div>
  );
};
