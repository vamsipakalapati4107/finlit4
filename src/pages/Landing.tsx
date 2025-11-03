import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, Brain, Trophy, Sparkles, DollarSign, TrendingUp } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
            <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI-Powered Financial Learning
            </span>
          </div>
          
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            Master Your Money with AI
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Learn financial literacy through gamified lessons, track expenses automatically, 
            and get AI-powered insights to achieve your financial goals.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8"
              onClick={() => navigate('/signup')}
            >
              Start Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Track Expenses</h3>
            <p className="text-gray-600">
              Automatically categorize and track your spending with smart AI-powered insights.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3">AI Insights</h3>
            <p className="text-gray-600">
              Get personalized recommendations and predictions to optimize your finances.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Gamified Learning</h3>
            <p className="text-gray-600">
              Earn XP, unlock badges, and level up while learning financial literacy.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
              <Target className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Goal Setting</h3>
            <p className="text-gray-600">
              Set and track savings goals with visual progress indicators and milestones.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Budget Planning</h3>
            <p className="text-gray-600">
              Create smart budgets with AI recommendations and real-time tracking.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Achievements</h3>
            <p className="text-gray-600">
              Unlock 100+ unique badges and celebrate your financial milestones.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-8 mt-20">
          <div className="text-center">
            <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              50K+
            </div>
            <div className="text-gray-600">Happy Users</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
              $10M+
            </div>
            <div className="text-gray-600">Money Saved</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
              98%
            </div>
            <div className="text-gray-600">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent mb-2">
              4.9★
            </div>
            <div className="text-gray-600">User Rating</div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Take Control of Your Finances?</h2>
          <p className="text-xl mb-8 opacity-90">Join thousands of users mastering their money today.</p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-12"
            onClick={() => navigate('/signup')}
          >
            Get Started Free
          </Button>
        </div>
      </div>
    </div>
  );
}
