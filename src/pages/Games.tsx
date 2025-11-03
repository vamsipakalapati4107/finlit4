import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Trophy, Gamepad2, Target, TrendingUp, Zap, Star } from 'lucide-react';

const games = [
  {
    id: 'budget-challenge',
    title: 'Budget Challenge',
    description: 'Survive 3 months of financial decisions. Can you balance needs, wants, and savings?',
    difficulty: 'Medium',
    xp: '200-500 XP',
    icon: Target,
    color: 'from-purple-500 to-purple-600',
    path: '/games/budget-challenge'
  },
  {
    id: 'investment-simulator',
    title: 'Investment Simulator',
    description: 'Buy and sell stocks in a realistic market. Learn investing without risk!',
    difficulty: 'Hard',
    xp: '300-600 XP',
    icon: TrendingUp,
    color: 'from-green-500 to-green-600',
    path: '/games/investment-simulator',
    comingSoon: true
  },
  {
    id: 'debt-destroyer',
    title: 'Debt Destroyer',
    description: 'Race against time to pay off debts using smart strategies!',
    difficulty: 'Easy',
    xp: '100-300 XP',
    icon: Zap,
    color: 'from-orange-500 to-orange-600',
    path: '/games/debt-destroyer',
    comingSoon: true
  },
  {
    id: 'savings-sprint',
    title: 'Savings Sprint',
    description: 'Reach your savings goal while managing daily expenses!',
    difficulty: 'Easy',
    xp: '150-350 XP',
    icon: Star,
    color: 'from-blue-500 to-blue-600',
    path: '/games/savings-sprint',
    comingSoon: true
  }
];

export default function Games() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Gamepad2 className="h-10 w-10 text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Financial Games
            </h1>
          </div>
          <p className="text-xl text-gray-600">
            Learn money management through fun, interactive games
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <Card key={game.id} className="p-6 hover:shadow-xl transition-shadow">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-4`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold mb-2">{game.title}</h3>
                <p className="text-gray-600 mb-4">{game.description}</p>

                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                    {game.difficulty}
                  </div>
                  <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold">
                    {game.xp}
                  </div>
                </div>

                {game.comingSoon ? (
                  <Button disabled className="w-full">
                    Coming Soon
                  </Button>
                ) : (
                  <Button onClick={() => navigate(game.path)} className="w-full">
                    Play Now
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="p-8 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-8 w-8" />
                <h2 className="text-3xl font-bold">Leaderboard</h2>
              </div>
              <p className="text-lg opacity-90">
                Compete with other players and climb to the top!
              </p>
            </div>
            <Button variant="secondary" size="lg">
              View Leaderboard
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}