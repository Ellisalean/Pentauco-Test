import React, { useState, useCallback } from 'react';
import { quizQuestions } from './data/quizData';
import type { Question, UserAnswer } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import QuestionDisplay from './components/QuestionDisplay';
import ResultsScreen from './components/ResultsScreen';
import { ArrowLeft, ArrowRight, Home, PlayCircle } from 'lucide-react';

const App: React.FC = () => {
    const [quizState, setQuizState] = useState<'welcome' | 'active' | 'results'>('welcome');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [userAnswers, setUserAnswers] = useState<(UserAnswer)[]>(new Array(quizQuestions.length).fill(null));
    const [score, setScore] = useState<number>(0);
    const [studentName, setStudentName] = useState<string>('');
    const [studentLastName, setStudentLastName] = useState<string>('');

    const handleStartQuiz = useCallback((name: string, lastName: string) => {
        setStudentName(name);
        setStudentLastName(lastName);
        setQuizState('active');
    }, []);

    const handleRestartQuiz = useCallback(() => {
        setCurrentQuestionIndex(0);
        setUserAnswers(new Array(quizQuestions.length).fill(null));
        setScore(0);
        setStudentName('');
        setStudentLastName('');
        setQuizState('welcome');
    }, []);

    const handleNextQuestion = useCallback((answer: UserAnswer) => {
        const updatedAnswers = [...userAnswers];
        updatedAnswers[currentQuestionIndex] = answer;
        setUserAnswers(updatedAnswers);

        if (currentQuestionIndex < quizQuestions.length - 1) {
            setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        } else {
            // Calculate final score
            let finalScore = 0;
            quizQuestions.forEach((q, index) => {
                const userAnswer = updatedAnswers[index];
                let isCorrect = false;
                switch (q.type) {
                    case 'MULTIPLE_CHOICE':
                        const selectedOption = q.options?.find(opt => opt.text === userAnswer);
                        if (selectedOption?.isCorrect) isCorrect = true;
                        break;
                    case 'FILL_IN_THE_BLANK':
                        if (typeof userAnswer === 'string' && userAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()) isCorrect = true;
                        break;
                    case 'TRUE_FALSE':
                        if (userAnswer === q.correctBoolean) isCorrect = true;
                        break;
                    case 'OPEN_ENDED':
                        if (typeof userAnswer === 'string' && q.keywords) {
                            const lowerAnswer = userAnswer.toLowerCase();
                            isCorrect = q.keywords.some(keyword => lowerAnswer.includes(keyword.toLowerCase()));
                        }
                        break;
                    case 'DRAG_AND_DROP':
                    case 'IMAGE_DRAG_AND_DROP':
                         if (userAnswer && typeof userAnswer === 'object' && !Array.isArray(userAnswer)) {
                            const correctMatches = q.dragItems?.reduce((acc, item, idx) => {
                                return (userAnswer as Record<string, string>)[`t${idx+1}`] === item.text ? acc + 1 : acc;
                            }, 0) || 0;
                             finalScore += (correctMatches / (q.dragItems?.length || 1)) * q.points;
                         }
                        break;
                    case 'TIMELINE':
                        if (Array.isArray(userAnswer)) {
                             const correctPositions = q.timelineEvents?.reduce((acc, event, idx) => {
                                return (userAnswer as string[]).indexOf(event.text) === event.correctOrder ? acc + 1 : acc;
                             }, 0) || 0;
                             finalScore += (correctPositions / (q.timelineEvents?.length || 1)) * q.points;
                        }
                        break;
                    case 'COMPARATIVE_CHART':
                         if (userAnswer && typeof userAnswer === 'object' && !Array.isArray(userAnswer)) {
                            const correctPlacements = q.chartItems?.reduce((acc, item) => {
                                return (userAnswer as Record<string, string>)[item.id] === item.category ? acc + 1 : acc;
                            }, 0) || 0;
                            finalScore += (correctPlacements / (q.chartItems?.length || 1)) * q.points;
                         }
                        break;
                }
                if(isCorrect) {
                    finalScore += q.points;
                }
            });
            const roundedScore = Math.round(finalScore);
            setScore(roundedScore);
            setQuizState('results');
        }
    }, [currentQuestionIndex, userAnswers]);

    const handlePrevQuestion = useCallback(() => {
        if (quizState === 'active' && currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    }, [quizState, currentQuestionIndex]);

    const handleSkipNextQuestion = useCallback(() => {
        if (quizState === 'active' && currentQuestionIndex < quizQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, [quizState, currentQuestionIndex]);

    const renderContent = () => {
        switch (quizState) {
            case 'active':
                return (
                    <QuestionDisplay
                        question={quizQuestions[currentQuestionIndex]}
                        onNext={handleNextQuestion}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={quizQuestions.length}
                        initialAnswer={userAnswers[currentQuestionIndex]}
                    />
                );
            case 'results':
                const totalPoints = quizQuestions.reduce((acc, q) => acc + q.points, 0);
                return (
                    <ResultsScreen
                        studentName={studentName}
                        studentLastName={studentLastName}
                        score={score}
                        totalPoints={totalPoints}
                        onRestart={handleRestartQuiz}
                        questions={quizQuestions}
                        userAnswers={userAnswers}
                    />
                );
            case 'welcome':
            default:
                return <WelcomeScreen onStart={handleStartQuiz} />;
        }
    };

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-200 overflow-hidden" style={{ backgroundImage: 'url("https://picsum.photos/seed/officebg/1920/1080")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {/* Main Content Area */}
            <main className="flex-grow flex items-center justify-center p-4 md:p-8 backdrop-blur-sm bg-black/20 overflow-y-auto">
                <div className="w-full max-w-5xl my-auto">
                    {renderContent()}
                </div>
            </main>

            {/* Bottom Bar */}
            <div className="h-14 bg-[#2e7d32] text-white flex items-center justify-between px-6 text-sm font-semibold shrink-0">
                <div className="flex items-center gap-8">
                    <span className="hidden md:inline font-bold">Pentateuco-Test</span>
                    <span>Section 1</span>
                    <span className="md:ml-8">{quizState === 'active' ? `${currentQuestionIndex + 1} / ${quizQuestions.length}` : ''}</span>
                </div>
                <div className="flex items-center gap-6">
                    <ArrowLeft 
                        size={20} 
                        className={`cursor-pointer transition-colors ${quizState === 'active' && currentQuestionIndex > 0 ? 'hover:text-gray-300' : 'opacity-50 cursor-not-allowed'}`} 
                        onClick={handlePrevQuestion}
                    />
                    <ArrowRight 
                        size={20} 
                        className={`cursor-pointer transition-colors ${quizState === 'active' && currentQuestionIndex < quizQuestions.length - 1 ? 'hover:text-gray-300' : 'opacity-50 cursor-not-allowed'}`} 
                        onClick={handleSkipNextQuestion}
                    />
                    <Home 
                        size={20} 
                        className="cursor-pointer hover:text-gray-300 transition-colors" 
                        onClick={handleRestartQuiz}
                    />
                </div>
            </div>
        </div>
    );
};

export default App;