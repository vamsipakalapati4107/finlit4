import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useNavigate, useParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { toast } from 'sonner';
import { BookOpen, Clock, Award, CheckCircle2, Lock, ArrowLeft, ArrowRight } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  content: string;
  order_index: number;
  xp_reward: number;
  estimated_minutes: number;
  completed?: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  lessons_count: number;
  estimated_hours: number;
  icon: string;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ensuringContent, setEnsuringContent] = useState(false);

  useEffect(() => {
    loadCourse();
  }, [courseId, user]);

  const loadCourse = async () => {
    if (!courseId) return;

    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError && courseError.code !== 'PGRST116') throw courseError;

      // If course missing, generate via Edge Function and seed ephemeral data in-memory
      if (!courseData) {
        const { data: gen, error: genError } = await supabase.functions.invoke('generate-course', {
          body: { courseId, titleHint: 'Financial Literacy Deep Dive' }
        });
        if (genError || (gen as any)?.error) {
          throw new Error((gen as any)?.error || genError?.message || 'Failed to generate course');
        }
        const generated = gen as any;
        setCourse({
          id: courseId,
          title: generated.course.title,
          description: generated.course.description,
          difficulty: generated.course.difficulty,
          lessons_count: generated.lessons.length,
          estimated_hours: generated.course.estimated_hours,
          icon: generated.course.icon || '📘',
        });
        const syntheticLessons = (generated.lessons as any[]).map((l, idx) => ({
          id: `${courseId}-lesson-${idx+1}`,
          title: l.title,
          content: l.content,
          order_index: idx + 1,
          xp_reward: l.xp_reward ?? 100,
          estimated_minutes: l.estimated_minutes ?? 10,
          completed: false,
        }));
        setLessons(syntheticLessons);
        return;
      }

      setCourse(courseData);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (lessonsError && lessonsError.code !== 'PGRST116') throw lessonsError;

      if (!lessonsData || lessonsData.length === 0) {
        // Generate lessons dynamically if not present in DB
        const { data: gen, error: genError } = await supabase.functions.invoke('generate-course', {
          body: { courseId, titleHint: courseData?.title }
        });
        if (genError || (gen as any)?.error) {
          throw new Error((gen as any)?.error || genError?.message || 'Failed to generate lessons');
        }
        const generated = gen as any;
        const syntheticLessons = (generated.lessons as any[]).map((l, idx) => ({
          id: `${courseId}-lesson-${idx+1}`,
          title: l.title,
          content: l.content,
          order_index: idx + 1,
          xp_reward: l.xp_reward ?? 100,
          estimated_minutes: l.estimated_minutes ?? 10,
          completed: false,
        }));
        setLessons(syntheticLessons);
        return;
      }

      if (user) {
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('lesson_id, completed')
          .eq('user_id', user.id)
          .eq('course_id', courseId);

        const progressMap = new Map(progressData?.map(p => [p.lesson_id, p.completed]) || []);
        
        const lessonsWithProgress = lessonsData?.map(lesson => ({
          ...lesson,
          completed: progressMap.get(lesson.id) || false
        })) || [];

        setLessons(lessonsWithProgress);
        // Generate and persist missing content
        const missing = lessonsWithProgress.filter(l => !l.content || l.content.trim() === '');
        if (missing.length > 0) {
          for (const l of missing) {
            try {
              const { data: gen, error: genErr } = await supabase.functions.invoke('generate-lesson', {
                body: { lessonId: l.id, courseId, title: l.title }
              });
              if (!genErr && (gen as any)?.content) {
                setLessons(curr => curr.map(item => item.id === l.id ? { ...item, content: (gen as any).content } : item));
              }
            } catch {}
          }
        }
      } else {
        setLessons(lessonsData || []);
      }
    } catch (error) {
      console.error('Error loading course:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const markLessonComplete = async () => {
    if (!user || !courseId) return;

    const currentLesson = lessons[currentLessonIndex];
    if (!currentLesson) return;

    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_id: courseId,
          lesson_id: currentLesson.id,
          completed: true,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user.id)
        .single();

      if (profile) {
        const newXP = (profile.xp || 0) + currentLesson.xp_reward;
        const newLevel = Math.floor(newXP / 1000) + 1;

        await supabase
          .from('profiles')
          .update({ xp: newXP, level: newLevel })
          .eq('id', user.id);

        toast.success(`Lesson completed! +${currentLesson.xp_reward} XP`);
      }

      loadCourse();
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast.error('Failed to save progress');
    }
  };

  const ensureLessonContent = async (lessonId: string, title: string) => {
    if (!courseId) return;
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson && lesson.content && lesson.content.trim() !== '') return;
    try {
      setEnsuringContent(true);
      const { data, error } = await supabase.functions.invoke('generate-lesson', {
        body: { lessonId, courseId, title }
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Failed to generate');
      }
      if ((data as any)?.content) {
        setLessons(curr => curr.map(l => l.id === lessonId ? { ...l, content: (data as any).content } : l));
        toast.success('Lesson content generated');
      }
    } catch (e: any) {
      const msg = e?.message || 'Unknown error';
      console.error('ensureLessonContent error:', msg);
      toast.error(`Could not generate lesson content: ${msg}`);
    } finally {
      setEnsuringContent(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course || lessons.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Course Not Found</h2>
            <Button onClick={() => navigate('/learn')}>Back to Courses</Button>
          </Card>
        </div>
      </div>
    );
  }

  const currentLesson = lessons[currentLessonIndex];
  const completedLessons = lessons.filter(l => l.completed).length;
  const progressPercentage = (completedLessons / lessons.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/learn')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{course.icon}</span>
                <h1 className="text-3xl font-bold">{course.title}</h1>
              </div>
              <p className="text-gray-600 mb-4">{course.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{lessons.length} lessons</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{course.estimated_hours}h total</span>
                </div>
              </div>
            </div>

            <Card className="p-4 min-w-[200px]">
              <div className="text-sm text-gray-600 mb-2">Course Progress</div>
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {completedLessons}/{lessons.length}
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </Card>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-1 h-fit">
            <h3 className="text-xl font-bold mb-4">Lessons</h3>
            <div className="space-y-2">
              {lessons.map((lesson, index) => (
                <button
                  key={lesson.id}
                  onClick={() => setCurrentLessonIndex(index)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    index === currentLessonIndex
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">{lesson.title}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Clock className="h-3 w-3" />
                        {lesson.estimated_minutes} min
                        <Award className="h-3 w-3 ml-2" />
                        {lesson.xp_reward} XP
                      </div>
                    </div>
                    {lesson.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-8 lg:col-span-2">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">{currentLesson.title}</h2>
                {currentLesson.completed && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Completed</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {currentLesson.estimated_minutes} minutes
                </div>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  {currentLesson.xp_reward} XP
                </div>
              </div>
            </div>

            <div className="prose max-w-none mb-8 whitespace-pre-wrap">
              {currentLesson.content || (
                <div className="text-gray-500">No content yet. Click Start/Review to generate.</div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentLessonIndex(Math.max(0, currentLessonIndex - 1))}
                disabled={currentLessonIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => ensureLessonContent(currentLesson.id, currentLesson.title)}
                  disabled={ensuringContent}
                >
                  {currentLesson.completed ? 'Review' : 'Start'}
                </Button>

                {!currentLesson.completed && (
                  <Button onClick={markLessonComplete}>
                    Complete Lesson
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>

              <Button
                onClick={() => setCurrentLessonIndex(Math.min(lessons.length - 1, currentLessonIndex + 1))}
                disabled={currentLessonIndex === lessons.length - 1}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}