import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Trophy, Heart, Lightbulb, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
  topic: string;
}

export default function Quiz() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [quizComplete, setQuizComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .limit(10)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedQuestions = data.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options as string[],
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          difficulty: q.difficulty,
          topic: q.topic
        }));
        setQuestions(formattedQuestions);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load quiz questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (showExplanation) return;
    
    setSelectedAnswer(answer);
    setShowExplanation(true);

    const isCorrect = answer === questions[currentQuestion].correct_answer;

    if (isCorrect) {
      setScore(score + 1);
      toast.success('Correct! +100 XP');
    } else {
      setLives(lives - 1);
      toast.error('Incorrect answer');
    }
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Quiz complete
      setQuizComplete(true);
      await saveQuizAttempt();
    }
  };

  const saveQuizAttempt = async () => {
    if (!user) return;

    try {
      const xpEarned = score * 100;
      
      const { error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_type: 'general',
          topic: 'mixed',
          score,
          total_questions: questions.length,
          xp_earned: xpEarned
        });

      if (error) throw error;

      // Update user XP
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user.id)
        .single();

      if (profile) {
        const newXP = (profile.xp || 0) + xpEarned;
        const newLevel = Math.floor(newXP / 1000) + 1;

        await supabase
          .from('profiles')
          .update({ xp: newXP, level: newLevel })
          .eq('id', user.id);
      }

      toast.success(`Quiz completed! +${xpEarned} XP`);
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">No Questions Available</h2>
          <p className="text-gray-600 mb-6">Check back later for new quiz questions!</p>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Trophy className="h-20 w-20 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
          <p className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent my-4">
            {percentage}%
          </p>
          <p className="text-xl text-gray-600 mb-6">
            You scored {score} out of {questions.length}
          </p>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => window.location.reload()}>
              Take Another Quiz
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`h-6 w-6 ${i < lives ? 'fill-red-500 text-red-500' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Score</div>
            <div className="text-2xl font-bold text-purple-600">{score}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="p-8 mb-6">
          <div className="mb-4">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
              {question.topic}
            </span>
            <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {question.difficulty}
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-6">{question.question}</h2>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === question.correct_answer;
              const showResult = showExplanation;

              let buttonClass = 'w-full text-left p-4 rounded-lg border-2 transition-all ';
              
              if (!showResult) {
                buttonClass += isSelected
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50';
              } else {
                if (isCorrect) {
                  buttonClass += 'border-green-500 bg-green-50';
                } else if (isSelected && !isCorrect) {
                  buttonClass += 'border-red-500 bg-red-50';
                } else {
                  buttonClass += 'border-gray-200';
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  disabled={showExplanation}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{option}</span>
                    {showResult && isCorrect && (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 mb-1">Explanation</div>
                  <p className="text-blue-800">{question.explanation}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {showExplanation && (
          <Button onClick={handleNext} size="lg" className="w-full">
            {currentQuestion < questions.length - 1 ? (
              <>Next Question <ArrowRight className="ml-2 h-5 w-5" /></>
            ) : (
              <>Complete Quiz <Trophy className="ml-2 h-5 w-5" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
