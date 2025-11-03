import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { toast } from 'sonner';
import { Sparkles, Send, Loader2 } from 'lucide-react';

export default function AICoach() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const suggestedQuestions = [
    "How can I save more money each month?",
    "What's the best way to pay off my debts?",
    "Should I invest or save right now?",
    "How do I create an emergency fund?",
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user) return;

    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setMessage('');

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { message: text, userProfile: profile, expenses }
      });

      if (error || (data && (data as any).error)) {
        const detail = (data as any)?.error || (error as any)?.message || 'Unknown error';
        throw new Error(detail);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: (data as any).advice }]);
    } catch (error: any) {
      console.error('AI Coach error:', error?.message || error);
      toast.error(`Failed to get AI advice: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI Financial Coach
            </h1>
          </div>
          <p className="text-gray-600">Get personalized financial advice powered by AI</p>
        </div>

        {messages.length === 0 && (
          <Card className="p-8 mb-6">
            <h3 className="text-xl font-bold mb-4">Try asking:</h3>
            <div className="grid gap-3">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="text-left justify-start h-auto py-3"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-4 mb-6">
          {messages.map((msg, i) => (
            <Card key={i} className={`p-4 ${msg.role === 'user' ? 'bg-purple-50 ml-12' : 'bg-white mr-12'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-purple-600' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1">{msg.role === 'user' ? 'You' : 'AI Coach'}</div>
                  <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4 sticky bottom-4">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me anything about your finances..."
              className="resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(message);
                }
              }}
            />
            <Button 
              onClick={() => sendMessage(message)}
              disabled={loading || !message.trim()}
              size="icon"
              className="h-auto"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
