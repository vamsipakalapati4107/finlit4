-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  google_id TEXT,
  auth_provider TEXT DEFAULT 'email',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_login_date DATE,
  monthly_budget DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  payment_method TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME,
  tags TEXT[],
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expenses"
  ON public.expenses FOR ALL
  USING (auth.uid() = user_id);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  allocated_amount DECIMAL(10,2) NOT NULL,
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, period)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budgets"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id);

-- Create savings_goals table
CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  deadline DATE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
  ON public.savings_goals FOR ALL
  USING (auth.uid() = user_id);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'beginner',
  lessons_count INTEGER DEFAULT 0,
  estimated_hours INTEGER,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  USING (true);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  order_index INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 100,
  estimated_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons"
  ON public.lessons FOR SELECT
  USING (true);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  difficulty TEXT DEFAULT 'beginner',
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quiz questions"
  ON public.quiz_questions FOR SELECT
  USING (true);

-- Create user_progress table
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progress"
  ON public.user_progress FOR ALL
  USING (auth.uid() = user_id);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_type TEXT NOT NULL,
  topic TEXT,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken INTEGER,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quiz attempts"
  ON public.quiz_attempts FOR ALL
  USING (auth.uid() = user_id);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  rarity TEXT DEFAULT 'common',
  xp_reward INTEGER DEFAULT 0,
  coin_reward INTEGER DEFAULT 0,
  criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  USING (true);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  target_value DECIMAL(10,2),
  duration_days INTEGER,
  xp_reward INTEGER DEFAULT 0,
  badge_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view challenges"
  ON public.challenges FOR SELECT
  USING (true);

-- Create user_challenges table
CREATE TABLE public.user_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  progress DECIMAL(10,2) DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own challenges"
  ON public.user_challenges FOR ALL
  USING (auth.uid() = user_id);

-- Create trigger function for profile updates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add trigger to profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
  -- =====================================================
-- FINANCIAL LITERACY APP - COMPLETE DATABASE SETUP
-- =====================================================

-- 1. Insert Sample Courses
INSERT INTO public.courses (id, title, description, difficulty, lessons_count, estimated_hours, icon) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Budgeting Basics', 'Learn the fundamentals of creating and maintaining a budget', 'beginner', 5, 2, '💰'),
('550e8400-e29b-41d4-a716-446655440002', 'Saving Strategies', 'Master effective saving techniques and emergency funds', 'beginner', 6, 3, '🏦'),
('550e8400-e29b-41d4-a716-446655440003', 'Credit & Debt Management', 'Understand credit scores and debt reduction strategies', 'intermediate', 8, 4, '💳'),
('550e8400-e29b-41d4-a716-446655440004', 'Investment Fundamentals', 'Introduction to stocks, bonds, and investment principles', 'intermediate', 10, 5, '📈'),
('550e8400-e29b-41d4-a716-446655440005', 'Retirement Planning', 'Plan for your financial future and retirement', 'advanced', 8, 4, '🏖️'),
('550e8400-e29b-41d4-a716-446655440006', 'Tax Planning', 'Optimize your taxes and understand deductions', 'advanced', 7, 3, '📊');

-- 2. Insert Sample Lessons for Budgeting Basics
INSERT INTO public.lessons (id, course_id, title, content, order_index, xp_reward, estimated_minutes) VALUES
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'What is a Budget?', 
'# Understanding Budgets

A budget is a financial plan that helps you track income and expenses. It''s your roadmap to financial success!

## Key Components:
- **Income**: All money coming in
- **Fixed Expenses**: Rent, utilities, insurance
- **Variable Expenses**: Food, entertainment, shopping
- **Savings**: Money set aside for future goals

## The 50/30/20 Rule:
- 50% Needs (essentials)
- 30% Wants (lifestyle)
- 20% Savings & Debt

Remember: A budget isn''t restrictive—it''s empowering!', 1, 100, 15),

('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Tracking Your Income', 
'# Income Tracking

Understanding your income is the foundation of budgeting.

## Types of Income:
1. **Primary Income**: Salary, wages
2. **Side Income**: Freelance, gigs
3. **Passive Income**: Investments, rental
4. **Other**: Gifts, bonuses

## Action Steps:
- List all income sources
- Calculate monthly average
- Note payment schedules
- Track irregularities

💡 Tip: Use net income (after taxes) for accurate budgeting!', 2, 100, 20),

('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Fixed vs Variable Expenses', 
'# Understanding Expenses

Learn to categorize your spending for better control.

## Fixed Expenses:
- Rent/Mortgage
- Insurance
- Loan payments
- Subscriptions

## Variable Expenses:
- Groceries
- Dining out
- Entertainment
- Shopping

## Strategy:
- Reduce fixed costs when possible
- Control variable spending
- Track everything for 30 days
- Identify spending patterns

🎯 Goal: Optimize both categories!', 3, 100, 25),

('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Creating Your First Budget', 
'# Build Your Budget

Time to create your personalized budget!

## Steps:
1. Calculate total monthly income
2. List all fixed expenses
3. Estimate variable expenses
4. Set savings goals
5. Review and adjust

## Budget Methods:
- **Zero-Based**: Every dollar has a job
- **Envelope System**: Cash for categories
- **50/30/20**: Simple percentage rule

## Tools:
- Spreadsheets
- Apps (like this one!)
- Pen and paper

Start simple, then refine!', 4, 150, 30),

('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Maintaining Your Budget', 
'# Budget Maintenance

A budget needs regular care to stay effective.

## Weekly Tasks:
- Review spending
- Update categories
- Check progress

## Monthly Tasks:
- Reconcile accounts
- Adjust for next month
- Celebrate wins!

## Common Pitfalls:
- Being too restrictive
- Not tracking small purchases
- Forgetting irregular expenses
- Giving up after mistakes

## Success Tips:
- Review regularly
- Be flexible
- Learn from overspending
- Reward yourself

Remember: Progress, not perfection!', 5, 150, 20);

-- 3. Insert Quiz Questions
INSERT INTO public.quiz_questions (topic, difficulty, question, options, correct_answer, explanation) VALUES
-- Budgeting Questions
('budgeting', 'beginner', 'What percentage of income should go to needs in the 50/30/20 rule?', 
'["40%", "50%", "60%", "70%"]'::jsonb, '50%', 
'The 50/30/20 rule suggests 50% for needs, 30% for wants, and 20% for savings and debt repayment.'),

('budgeting', 'beginner', 'Which is an example of a fixed expense?', 
'["Groceries", "Entertainment", "Rent", "Dining out"]'::jsonb, 'Rent', 
'Rent is a fixed expense because it stays the same each month. Variable expenses like groceries and entertainment can change.'),

('budgeting', 'beginner', 'What is the first step in creating a budget?', 
'["Cut expenses", "Calculate income", "Open savings account", "Pay off debt"]'::jsonb, 'Calculate income', 
'Before planning expenses, you need to know how much money you have coming in.'),

-- Saving Questions
('saving', 'beginner', 'How many months of expenses should an emergency fund cover?', 
'["1-2 months", "3-6 months", "9-12 months", "24 months"]'::jsonb, '3-6 months', 
'Financial experts recommend saving 3-6 months of living expenses for emergencies.'),

('saving', 'intermediate', 'What is compound interest?', 
'["Interest on principal only", "Interest on principal and accumulated interest", "A type of savings account", "A penalty fee"]'::jsonb, 'Interest on principal and accumulated interest', 
'Compound interest means you earn interest on both your initial deposit and the interest that accumulates over time.'),

-- Credit Questions
('credit', 'intermediate', 'What is a good credit score range?', 
'["300-579", "580-669", "670-739", "740-850"]'::jsonb, '740-850', 
'Credit scores range from 300-850. A score of 740+ is considered very good to excellent.'),

('credit', 'intermediate', 'Which factor has the biggest impact on your credit score?', 
'["Credit age", "Payment history", "Credit inquiries", "Credit mix"]'::jsonb, 'Payment history', 
'Payment history accounts for about 35% of your credit score, making it the most important factor.'),

-- Investment Questions
('investing', 'intermediate', 'What is diversification in investing?', 
'["Buying only stocks", "Spreading investments across different assets", "Investing in one company", "Day trading"]'::jsonb, 'Spreading investments across different assets', 
'Diversification means spreading your money across different types of investments to reduce risk.'),

('investing', 'advanced', 'What does P/E ratio stand for?', 
'["Profit and Earnings", "Price-to-Earnings", "Principal Equity", "Periodic Evaluation"]'::jsonb, 'Price-to-Earnings', 
'P/E ratio (Price-to-Earnings) is a valuation metric that compares a company''s stock price to its earnings per share.'),

-- General Finance Questions
('general', 'beginner', 'What is net income?', 
'["Income before taxes", "Income after taxes and deductions", "Total salary", "Investment returns"]'::jsonb, 'Income after taxes and deductions', 
'Net income is what you actually take home after taxes and other deductions are removed from your gross income.'),

('general', 'beginner', 'What is a financial goal?', 
'["A wish", "A specific, measurable target", "A dream", "A budget category"]'::jsonb, 'A specific, measurable target', 
'Financial goals should be specific and measurable so you can track progress and know when you''ve achieved them.'),

('general', 'intermediate', 'What is inflation?', 
'["Rise in prices over time", "Interest rate", "Stock market crash", "Currency exchange"]'::jsonb, 'Rise in prices over time', 
'Inflation is the general increase in prices and decrease in purchasing power of money over time.'),

-- Advanced Questions
('retirement', 'advanced', 'What is a 401(k)?', 
'["A type of mortgage", "Employer-sponsored retirement plan", "Credit card", "Savings account"]'::jsonb, 'Employer-sponsored retirement plan', 
'A 401(k) is a retirement savings plan sponsored by employers that offers tax advantages.'),

('retirement', 'advanced', 'At what age can you withdraw from a 401(k) without penalty?', 
'["55", "59.5", "62", "65"]'::jsonb, '59.5', 
'You can withdraw from most retirement accounts at age 59½ without paying early withdrawal penalties.'),

('tax', 'advanced', 'What is a tax deduction?', 
'["Money the government owes you", "Expense that reduces taxable income", "A type of credit", "A penalty"]'::jsonb, 'Expense that reduces taxable income', 
'Tax deductions lower your taxable income, which can reduce the amount of tax you owe.');

-- 4. Insert Achievements
INSERT INTO public.achievements (id, name, description, icon, category, rarity, xp_reward, coin_reward, criteria) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'First Steps', 'Created your account and started your journey', '🎉', 'onboarding', 'common', 50, 10, '{"type": "signup"}'::jsonb),
('750e8400-e29b-41d4-a716-446655440002', 'Budget Beginner', 'Created your first budget', '💰', 'budgeting', 'common', 100, 25, '{"type": "budget_created"}'::jsonb),
('750e8400-e29b-41d4-a716-446655440003', 'Expense Tracker', 'Logged 10 expenses', '📝', 'tracking', 'common', 150, 30, '{"type": "expenses", "count": 10}'::jsonb),
('750e8400-e29b-41d4-a716-446655440004', 'Quiz Master', 'Completed 5 quizzes', '🧠', 'learning', 'uncommon', 200, 50, '{"type": "quizzes", "count": 5}'::jsonb),
('750e8400-e29b-41d4-a716-446655440005', 'Perfect Score', 'Got 100% on a quiz', '⭐', 'learning', 'rare', 300, 100, '{"type": "perfect_quiz"}'::jsonb),
('750e8400-e29b-41d4-a716-446655440006', 'Week Warrior', 'Maintained 7-day streak', '🔥', 'engagement', 'uncommon', 250, 75, '{"type": "streak", "days": 7}'::jsonb),
('750e8400-e29b-41d4-a716-446655440007', 'Level Up', 'Reached Level 5', '🚀', 'progression', 'uncommon', 500, 150, '{"type": "level", "target": 5}'::jsonb),
('750e8400-e29b-41d4-a716-446655440008', 'Savings Hero', 'Reached first savings goal', '🏆', 'saving', 'rare', 400, 200, '{"type": "savings_goal"}'::jsonb),
('750e8400-e29b-41d4-a716-446655440009', 'Budget Pro', 'Stayed within budget for 3 months', '💎', 'budgeting', 'epic', 1000, 500, '{"type": "budget_streak", "months": 3}'::jsonb),
('750e8400-e29b-41d4-a716-446655440010', 'Course Completed', 'Finished your first course', '📚', 'learning', 'uncommon', 300, 100, '{"type": "course_completed"}'::jsonb);

-- 5. Insert Challenges
INSERT INTO public.challenges (id, name, description, type, target_value, duration_days, xp_reward, badge_name) VALUES
('850e8400-e29b-41d4-a716-446655440001', 'No Spend Challenge', 'Don''t make any non-essential purchases', 'expense_limit', 0, 7, 500, '💪 No Spend Master'),
('850e8400-e29b-41d4-a716-446655440002', 'Save $100 Challenge', 'Save $100 in one month', 'savings', 100, 30, 750, '🏦 Century Saver'),
('850e8400-e29b-41d4-a716-446655440003', 'Daily Logger', 'Log expenses every day for a week', 'streak', 7, 7, 300, '📝 Consistent Tracker'),
('850e8400-e29b-41d4-a716-446655440004', 'Learning Sprint', 'Complete 3 courses in a month', 'courses', 3, 30, 1000, '🎓 Knowledge Seeker'),
('850e8400-e29b-41d4-a716-446655440005', 'Quiz Marathon', 'Take 10 quizzes in one week', 'quizzes', 10, 7, 600, '🧠 Quiz Champion');

-- 6. Create Views for Analytics
CREATE OR REPLACE VIEW user_spending_summary AS
SELECT 
    user_id,
    DATE_TRUNC('month', date) as month,
    category,
    SUM(amount) as total_spent,
    COUNT(*) as transaction_count,
    AVG(amount) as avg_transaction
FROM expenses
GROUP BY user_id, DATE_TRUNC('month', date), category;

CREATE OR REPLACE VIEW user_learning_progress AS
SELECT 
    p.user_id,
    COUNT(DISTINCT p.course_id) as courses_started,
    COUNT(DISTINCT CASE WHEN p.completed THEN p.course_id END) as courses_completed,
    SUM(CASE WHEN p.completed THEN l.xp_reward ELSE 0 END) as total_xp_earned
FROM user_progress p
LEFT JOIN lessons l ON p.lesson_id = l.id
GROUP BY p.user_id;

-- 7. Create Functions for Gamification

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_expense_count INTEGER;
    v_quiz_count INTEGER;
    v_perfect_quiz BOOLEAN;
    v_level INTEGER;
    v_streak INTEGER;
BEGIN
    -- Get user stats
    SELECT level, streak_days INTO v_level, v_streak
    FROM profiles WHERE id = p_user_id;
    
    SELECT COUNT(*) INTO v_expense_count
    FROM expenses WHERE user_id = p_user_id;
    
    SELECT COUNT(*) INTO v_quiz_count
    FROM quiz_attempts WHERE user_id = p_user_id;
    
    SELECT EXISTS(
        SELECT 1 FROM quiz_attempts 
        WHERE user_id = p_user_id 
        AND score = total_questions
    ) INTO v_perfect_quiz;
    
    -- Award achievements
    IF v_expense_count >= 10 AND NOT EXISTS(
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id 
        AND achievement_id = '750e8400-e29b-41d4-a716-446655440003'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, '750e8400-e29b-41d4-a716-446655440003');
    END IF;
    
    IF v_quiz_count >= 5 AND NOT EXISTS(
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id 
        AND achievement_id = '750e8400-e29b-41d4-a716-446655440004'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, '750e8400-e29b-41d4-a716-446655440004');
    END IF;
    
    IF v_perfect_quiz AND NOT EXISTS(
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id 
        AND achievement_id = '750e8400-e29b-41d4-a716-446655440005'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, '750e8400-e29b-41d4-a716-446655440005');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update user XP and level
CREATE OR REPLACE FUNCTION add_xp_to_user(p_user_id UUID, p_xp_amount INTEGER)
RETURNS void AS $$
DECLARE
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_new_coins INTEGER;
BEGIN
    UPDATE profiles
    SET xp = xp + p_xp_amount,
        coins = coins + (p_xp_amount / 10),
        level = FLOOR((xp + p_xp_amount) / 1000) + 1
    WHERE id = p_user_id;
    
    -- Check for achievements
    PERFORM check_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- 8. Create Triggers

-- Trigger to award XP on expense logging
CREATE OR REPLACE FUNCTION award_expense_xp()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM add_xp_to_user(NEW.user_id, 10);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_xp_trigger
AFTER INSERT ON expenses
FOR EACH ROW
EXECUTE FUNCTION award_expense_xp();

-- 9. Insert Sample Learning Content for Other Courses
INSERT INTO public.lessons (course_id, title, content, order_index, xp_reward, estimated_minutes) VALUES
-- Saving Strategies Course
('550e8400-e29b-41d4-a716-446655440002', 'Emergency Fund Basics', 
'# Building Your Safety Net

An emergency fund is crucial for financial stability.

## Why You Need One:
- Unexpected medical bills
- Car repairs
- Job loss
- Home repairs

## How Much to Save:
- Start: $1,000
- Goal: 3-6 months expenses
- High risk jobs: 6-12 months

## Where to Keep It:
- High-yield savings account
- Money market account
- Easily accessible
- Separate from daily banking

Start small, build consistently!', 1, 100, 20),

-- Credit & Debt Course
('550e8400-e29b-41d4-a716-446655440003', 'Understanding Credit Scores', 
'# Credit Score Fundamentals

Your credit score affects loans, rentals, and more.

## Score Ranges:
- 300-579: Poor
- 580-669: Fair
- 670-739: Good
- 740-799: Very Good
- 800-850: Excellent

## Factors Affecting Score:
1. Payment History (35%)
2. Credit Utilization (30%)
3. Credit Age (15%)
4. Credit Mix (10%)
5. New Credit (10%)

## Improvement Tips:
- Pay on time
- Keep utilization under 30%
- Don''t close old accounts
- Check reports regularly

Build credit, build wealth!', 1, 150, 25);

-- 10. Add Indexes for Performance
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id, created_at DESC);
CREATE INDEX idx_user_progress_user_course ON user_progress(user_id, course_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- 11. Grant First Achievement to All Existing Users
INSERT INTO user_achievements (user_id, achievement_id)
SELECT id, '750e8400-e29b-41d4-a716-446655440001'
FROM profiles
WHERE NOT EXISTS (
    SELECT 1 FROM user_achievements 
    WHERE user_id = profiles.id 
    AND achievement_id = '750e8400-e29b-41d4-a716-446655440001'
);

COMMIT;