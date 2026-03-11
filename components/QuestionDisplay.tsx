
import React, { useState, useEffect, useCallback } from 'react';
import type { Question, UserAnswer, DragItem, TimelineEvent, ChartItem } from '../types';
import { QuestionType } from '../types';
import { Check, X, ArrowRight, CornerDownLeft, CheckCircle, XCircle, Leaf } from 'lucide-react';

interface QuestionDisplayProps {
    question: Question;
    onNext: (answer: UserAnswer) => void;
    questionNumber: number;
    totalQuestions: number;
    initialAnswer?: UserAnswer;
}

// Helper for shuffling arrays
const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
};

const getCorrectAnswerText = (question: Question): string => {
    switch (question.type) {
        case QuestionType.MULTIPLE_CHOICE:
            return question.options?.find(o => o.isCorrect)?.text || 'N/A';
        case QuestionType.FILL_IN_THE_BLANK:
            return question.correctAnswer || 'N/A';
        case QuestionType.TRUE_FALSE:
            return question.correctBoolean ? 'Verdadero' : 'Falso';
        default:
            return 'Ver respuestas detalladas.';
    }
};

const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
        case QuestionType.MULTIPLE_CHOICE: return 'Opción Múltiple';
        case QuestionType.FILL_IN_THE_BLANK: return 'Completar Espacio';
        case QuestionType.TRUE_FALSE: return 'Verdadero o Falso';
        case QuestionType.DRAG_AND_DROP: return 'Arrastrar y Soltar';
        case QuestionType.IMAGE_DRAG_AND_DROP: return 'Arrastrar y Soltar en Imagen';
        case QuestionType.TIMELINE: return 'Línea de Tiempo';
        case QuestionType.COMPARATIVE_CHART: return 'Cuadro Comparativo';
        default: return 'Pregunta';
    }
};

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, onNext, questionNumber, totalQuestions, initialAnswer }) => {
    const [answer, setAnswer] = useState<UserAnswer>(initialAnswer || null);
    const [shuffledDragItems, setShuffledDragItems] = useState<DragItem[]>([]);
    const [shuffledTimelineEvents, setShuffledTimelineEvents] = useState<TimelineEvent[]>([]);
    const [shuffledChartItems, setShuffledChartItems] = useState<ChartItem[]>([]);

    const [dragAndDropState, setDragAndDropState] = useState<Record<string, string | null>>({});
    const [timelineState, setTimelineState] = useState<TimelineEvent[]>([]);
    const [chartState, setChartState] = useState<Record<string, string | null>>({});
    
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [key, setKey] = useState(question.id);

    const hasImages = question.type === QuestionType.MULTIPLE_CHOICE && question.options?.some(opt => opt.imageUrl);

    useEffect(() => {
        setKey(question.id);
        setAnswer(initialAnswer || null);
        setIsSubmitted(false);
        setIsCorrect(false);

        if ((question.type === QuestionType.DRAG_AND_DROP || question.type === QuestionType.IMAGE_DRAG_AND_DROP) && question.dragItems) {
            const initialDndState: Record<string, string | null> = {};
            if (question.type === QuestionType.IMAGE_DRAG_AND_DROP) {
                question.imageDropTargets?.forEach(t => initialDndState[t.id] = null);
            } else {
                question.dropTargets?.forEach(t => initialDndState[t.id] = null);
            }
            setDragAndDropState(initialDndState);
            setShuffledDragItems(shuffleArray(question.dragItems));
        }
        if (question.type === QuestionType.TIMELINE && question.timelineEvents) {
            const shuffled = shuffleArray(question.timelineEvents);
            setTimelineState(shuffled);
        }
        if (question.type === QuestionType.COMPARATIVE_CHART && question.chartItems) {
            const initialChartState: Record<string, string | null> = {};
            question.chartItems.forEach(item => initialChartState[item.id] = null);
            setChartState(initialChartState);
            setShuffledChartItems(shuffleArray(question.chartItems));
        }
    }, [question.id, initialAnswer, question.type, question.dragItems, question.imageDropTargets, question.dropTargets, question.timelineEvents, question.chartItems]);

    const handleSubmit = () => {
        let finalAnswer: UserAnswer = answer;
        if (question.type === QuestionType.DRAG_AND_DROP || question.type === QuestionType.IMAGE_DRAG_AND_DROP) {
           const mappedAnswer: Record<string, string> = {};
           Object.entries(dragAndDropState).forEach(([targetId, dragId]) => {
                if (dragId) {
                    const dragItem = question.dragItems?.find(d => d.id === dragId);
                    if (dragItem) mappedAnswer[targetId] = dragItem.text;
                }
           });
           finalAnswer = mappedAnswer;
           setAnswer(finalAnswer);
        } else if (question.type === QuestionType.TIMELINE) {
            finalAnswer = timelineState.map(event => event.text);
            setAnswer(finalAnswer);
        } else if(question.type === QuestionType.COMPARATIVE_CHART) {
            finalAnswer = chartState;
            setAnswer(finalAnswer);
        }

        let correct = false;
        switch (question.type) {
            case 'MULTIPLE_CHOICE':
                const selectedOption = question.options?.find(opt => opt.text === finalAnswer);
                if (selectedOption?.isCorrect) correct = true;
                break;
            case 'FILL_IN_THE_BLANK':
                if (typeof finalAnswer === 'string' && finalAnswer.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim()) correct = true;
                break;
            case 'TRUE_FALSE':
                if (finalAnswer === question.correctBoolean) correct = true;
                break;
            case 'OPEN_ENDED':
                if (typeof finalAnswer === 'string' && question.keywords) {
                    const lowerAnswer = finalAnswer.toLowerCase();
                    correct = question.keywords.some(keyword => lowerAnswer.includes(keyword.toLowerCase()));
                }
                break;
            case 'DRAG_AND_DROP':
            case 'IMAGE_DRAG_AND_DROP':
                 if (finalAnswer && typeof finalAnswer === 'object' && !Array.isArray(finalAnswer)) {
                    const correctMatches = question.dragItems?.reduce((acc, item, idx) => {
                        return (finalAnswer as Record<string, string>)[`t${idx+1}`] === item.text ? acc + 1 : acc;
                    }, 0) || 0;
                     if (correctMatches === question.dragItems?.length) correct = true;
                 }
                break;
            case 'TIMELINE':
                if (Array.isArray(finalAnswer)) {
                     const correctPositions = question.timelineEvents?.reduce((acc, event, idx) => {
                        return (finalAnswer as string[]).indexOf(event.text) === event.correctOrder ? acc + 1 : acc;
                     }, 0) || 0;
                     if (correctPositions === question.timelineEvents?.length) correct = true;
                }
                break;
            case 'COMPARATIVE_CHART':
                 if (finalAnswer && typeof finalAnswer === 'object' && !Array.isArray(finalAnswer)) {
                    const correctPlacements = question.chartItems?.reduce((acc, item) => {
                        return (finalAnswer as Record<string, string>)[item.id] === item.category ? acc + 1 : acc;
                    }, 0) || 0;
                    if (correctPlacements === question.chartItems?.length) correct = true;
                 }
                break;
        }
        setIsCorrect(correct);
        setIsSubmitted(true);
    };

    const handleContinue = () => {
        onNext(answer);
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
        e.dataTransfer.setData("itemId", itemId);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData("itemId");
        if(itemId) {
            setDragAndDropState(prev => ({...prev, [targetId]: itemId}));
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const renderQuestionType = () => {
        switch (question.type) {
            case QuestionType.MULTIPLE_CHOICE:
                return (
                    <div className="space-y-4 mt-6">
                        {question.options?.map((option, index) => (
                            <div 
                                key={index} 
                                className="flex items-start gap-4 cursor-pointer group"
                                onClick={() => setAnswer(option.text)}
                            >
                                <div className="mt-1">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answer === option.text ? 'border-white' : 'border-gray-400 group-hover:border-white'}`}>
                                        {answer === option.text && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                    </div>
                                </div>
                                <span className={`text-lg font-light ${answer === option.text ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                    {option.text}
                                </span>
                            </div>
                        ))}
                    </div>
                );
            case QuestionType.FILL_IN_THE_BLANK:
                 return (
                    <div className="mt-6">
                        <input
                            type="text"
                            value={(answer as string) || ''}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Escribe tu respuesta aquí"
                            className="w-full p-3 bg-transparent border-b-2 border-gray-500 text-white placeholder-gray-500 focus:border-[#4caf50] outline-none transition"
                        />
                    </div>
                );
            case QuestionType.TRUE_FALSE:
                return (
                     <div className="space-y-4 mt-6">
                        <div 
                            className="flex items-start gap-4 cursor-pointer group"
                            onClick={() => setAnswer(true)}
                        >
                            <div className="mt-1">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answer === true ? 'border-white' : 'border-gray-400 group-hover:border-white'}`}>
                                    {answer === true && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                </div>
                            </div>
                            <span className={`text-lg font-light ${answer === true ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                Verdadero
                            </span>
                        </div>
                        <div 
                            className="flex items-start gap-4 cursor-pointer group"
                            onClick={() => setAnswer(false)}
                        >
                            <div className="mt-1">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answer === false ? 'border-white' : 'border-gray-400 group-hover:border-white'}`}>
                                    {answer === false && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                </div>
                            </div>
                            <span className={`text-lg font-light ${answer === false ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                Falso
                            </span>
                        </div>
                    </div>
                );
            case QuestionType.DRAG_AND_DROP:
                return (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold text-gray-300 mb-3 text-center">Personajes</h3>
                            <div className="space-y-3">
                                {shuffledDragItems.map(item => (
                                    <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item.id)} className="p-3 bg-[#4a4a4a] text-white rounded-full cursor-grab active:cursor-grabbing text-center shadow-md">
                                        {item.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-300 mb-3 text-center">Descripciones</h3>
                            <div className="space-y-3">
                                {question.dropTargets?.map(target => (
                                    <div key={target.id} onDrop={(e) => handleDrop(e, target.id)} onDragOver={handleDragOver} className="p-3 min-h-[60px] bg-[#2a2d2f] border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-between">
                                        <span className="text-gray-400 flex-1 text-sm">{target.text}</span>
                                        {dragAndDropState[target.id] && <div className="ml-2 p-2 bg-[#4caf50] text-white rounded-full text-sm">{question.dragItems?.find(d => d.id === dragAndDropState[target.id])?.text}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
             case QuestionType.TIMELINE:
                return (
                    <div className="mt-6">
                         <p className="text-sm text-gray-400 mb-4">Arrastra los eventos para ordenarlos.</p>
                         <div className="space-y-3">
                             {timelineState.map((event, index) => (
                                 <div key={event.id} draggable onDragStart={(e) => e.dataTransfer.setData("timelineIndex", index.toString())} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                                     const draggedIndex = parseInt(e.dataTransfer.getData("timelineIndex"), 10);
                                     const newOrder = [...timelineState];
                                     const [draggedItem] = newOrder.splice(draggedIndex, 1);
                                     newOrder.splice(index, 0, draggedItem);
                                     setTimelineState(newOrder);
                                 }} className="p-4 bg-[#4a4a4a] text-white rounded-lg flex items-center cursor-move shadow-md">
                                     <span className="font-bold text-[#4caf50] mr-4">{index + 1}.</span> {event.text}
                                 </div>
                             ))}
                         </div>
                    </div>
                );
            case QuestionType.COMPARATIVE_CHART:
                const handleChartDrop = (e: React.DragEvent<HTMLDivElement>, category: string) => {
                    e.preventDefault();
                    const itemId = e.dataTransfer.getData("itemId");
                    setChartState(prev => ({ ...prev, [itemId]: category }));
                };

                return (
                    <div className="mt-6">
                        <div className="mb-6 p-4 bg-[#2a2d2f] rounded-lg flex flex-wrap gap-3 justify-center">
                            {shuffledChartItems.filter(item => !chartState[item.id]).map(item => (
                                <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item.id)} className="p-2 bg-[#4a4a4a] text-white rounded-full cursor-grab shadow-md text-sm">
                                    {item.description}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {question.chartCategories?.map(category => (
                                <div key={category} className="p-4 bg-[#2a2d2f] rounded-lg">
                                    <h3 className="font-bold text-[#4caf50] text-center mb-3">{category}</h3>
                                    <div onDrop={(e) => handleChartDrop(e, category)} onDragOver={handleDragOver} className="min-h-[150px] bg-[#1e2022] border border-gray-600 rounded space-y-2 p-2">
                                        {shuffledChartItems.filter(item => chartState[item.id] === category).map(item => (
                                            <div key={item.id} className="p-2 bg-[#4caf50] text-white rounded-full text-sm text-center">{item.description}</div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };
    
    if (hasImages) {
        return (
            <div key={key} className="w-full max-w-5xl mx-auto h-[80vh] min-h-[500px] max-h-[800px] overflow-y-auto bg-[#e8ece9] shadow-2xl flex flex-col relative animate__animated animate__fadeIn p-6 md:p-10 font-sans">
                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1b4332] mb-3">Pregunta {questionNumber}.</h2>
                    <p className="text-base md:text-lg text-[#1b4332] font-medium max-w-4xl mx-auto leading-relaxed">
                        {question.questionText}
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto w-full mb-8">
                    {question.options?.map((option, index) => {
                        const isSelected = answer === option.text;
                        return (
                            <div 
                                key={index}
                                onClick={() => !isSubmitted && setAnswer(option.text)}
                                className={`relative flex flex-col cursor-pointer bg-white shadow-lg transition-all duration-300 h-48 md:h-56 overflow-hidden ${isSelected ? 'ring-4 ring-[#81c784]' : 'hover:shadow-xl'}`}
                            >
                                <img src={option.imageUrl} alt={`Opción ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                                
                                <div className={`absolute bottom-0 left-0 right-0 p-3 md:p-4 flex items-start gap-3 transition-colors duration-300 ${isSelected ? 'bg-[#81c784]' : 'bg-white/90 backdrop-blur-sm'}`}>
                                    <div className="mt-0.5 shrink-0">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'border-[6px] border-[#1b4332] bg-white' : 'border-[#1b4332] bg-transparent'}`}>
                                        </div>
                                    </div>
                                    <span className={`text-sm md:text-base font-medium text-[#1b4332] leading-tight`}>
                                        {option.text}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Bar */}
                <div className="mt-auto max-w-6xl mx-auto w-full flex items-center justify-end gap-8">
                    <button 
                        onClick={handleSubmit}
                        disabled={answer === null || isSubmitted}
                        className="flex items-center gap-3 px-6 py-3 bg-[#c8e6c9] text-[#1b4332] font-medium text-lg disabled:opacity-50 transition-colors hover:bg-[#a5d6a7]"
                    >
                        <CornerDownLeft className="w-6 h-6" /> Submit
                    </button>
                </div>

                {/* Modal */}
                {isSubmitted && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm p-4">
                        <div className="bg-[#e8ece9] shadow-2xl max-w-3xl w-full relative animate__animated animate__zoomIn pb-16">
                            <div className="flex items-center">
                                <div className="bg-[#1b4332] w-32 h-32 flex items-center justify-center shrink-0">
                                    {isCorrect ? <Leaf className="text-white w-12 h-12" /> : <XCircle className="text-white w-12 h-12" />}
                                </div>
                                <div className="px-8">
                                    <h2 className="text-4xl md:text-5xl font-bold text-[#1b4332]">
                                        {isCorrect ? "¡Correcto!" : "¡Incorrecto!"}
                                    </h2>
                                </div>
                            </div>
                            <div className="p-8 md:px-12 text-[#1b4332] text-lg md:text-xl">
                                <p className="leading-relaxed">
                                    {isCorrect 
                                        ? "¡Excelente trabajo! Has elegido la respuesta correcta. Sigue así con las siguientes preguntas." 
                                        : `La respuesta correcta era: ${getCorrectAnswerText(question)}. No te preocupes, ¡sigue intentándolo!`}
                                </p>
                            </div>
                            <button 
                                onClick={handleContinue}
                                className="absolute bottom-0 right-0 w-16 h-16 bg-[#a5d6a7] hover:bg-[#81c784] transition-colors flex items-center justify-center text-[#1b4332]"
                            >
                                <ArrowRight className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (question.type === QuestionType.OPEN_ENDED) {
        return (
            <div key={key} className="w-full max-w-5xl mx-auto h-[80vh] min-h-[500px] max-h-[800px] overflow-hidden bg-[#1b4332] shadow-2xl flex flex-col animate__animated animate__fadeIn font-sans relative" style={{ backgroundImage: 'url("https://picsum.photos/seed/leaves/1920/1080")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
                
                <div className="relative z-10 flex flex-col h-full p-8 md:p-12">
                    {/* Header */}
                    <div className="text-center mb-12 mt-8">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">Pregunta {questionNumber}.</h2>
                        <p className="text-lg md:text-xl text-white font-medium max-w-3xl mx-auto leading-relaxed drop-shadow-md">
                            {question.questionText}
                        </p>
                    </div>

                    {/* Input Area */}
                    <div className="flex-grow flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
                        {isSubmitted && (
                            <div className="mb-6 text-center animate__animated animate__fadeIn">
                                <p className="text-white text-lg font-medium drop-shadow-md">
                                    {isCorrect ? '¡Excelente respuesta!' : 'Gracias por tu respuesta. (Se requiere revisión manual para puntaje exacto)'}
                                </p>
                            </div>
                        )}
                        <textarea
                            value={(answer as string) || ''}
                            onChange={(e) => !isSubmitted && setAnswer(e.target.value)}
                            placeholder="Escribe tu respuesta aquí"
                            disabled={isSubmitted}
                            className="w-full h-48 p-6 bg-[#81c784]/80 backdrop-blur-md border-2 border-dashed border-[#4caf50] text-white placeholder-white/70 focus:border-white focus:ring-0 outline-none transition-all resize-none text-lg rounded-sm shadow-inner disabled:opacity-90 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Bottom Bar */}
                    <div className="mt-auto w-full flex items-center justify-between pt-8">
                        {/* Progress Bar (Visual only) */}
                        <div className="flex-grow mr-8 h-1.5 bg-white/30 rounded-full overflow-hidden">
                            <div className="h-full bg-[#81c784]" style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}></div>
                        </div>

                        {!isSubmitted ? (
                            <button 
                                onClick={handleSubmit}
                                disabled={!answer || (answer as string).trim() === ''}
                                className="flex items-center gap-3 px-6 py-3 bg-[#c8e6c9] hover:bg-[#a5d6a7] text-[#1b4332] font-medium text-lg disabled:opacity-50 transition-colors shrink-0 shadow-lg"
                            >
                                <CornerDownLeft className="w-5 h-5" /> Submit
                            </button>
                        ) : (
                            <button 
                                onClick={handleContinue}
                                className="flex items-center gap-3 px-6 py-3 bg-[#c8e6c9] hover:bg-[#a5d6a7] text-[#1b4332] font-medium text-lg transition-colors shrink-0 shadow-lg"
                            >
                                Continuar <ArrowRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (question.type === QuestionType.DRAG_AND_DROP) {
        return (
            <div key={key} className="w-full max-w-5xl mx-auto h-[80vh] min-h-[500px] max-h-[800px] overflow-y-auto bg-white shadow-2xl flex flex-col animate__animated animate__fadeIn font-sans p-6 md:p-10 relative">
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1b4332] mb-3">Pregunta {questionNumber}.</h2>
                    <p className="text-base md:text-lg text-[#1b4332] font-bold max-w-4xl mx-auto leading-relaxed">
                        {question.questionText}
                    </p>
                    <p className="text-sm md:text-base text-[#1b4332] font-medium max-w-4xl mx-auto mt-2">
                        Haz clic y arrastra los elementos a las posiciones correctas.
                    </p>
                </div>

                {/* Drag Items Container */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 min-h-[80px]">
                    {shuffledDragItems.map(item => {
                        // Check if item is already dropped
                        const isDropped = Object.values(dragAndDropState).includes(item.id);
                        
                        return (
                            <div key={item.id} className="flex justify-center items-center">
                                {!isDropped && (
                                    <div 
                                        draggable 
                                        onDragStart={(e) => handleDragStart(e, item.id)} 
                                        className="bg-[#66bb6a] text-white p-4 w-full text-center cursor-grab active:cursor-grabbing relative shadow-md hover:shadow-lg transition-shadow"
                                    >
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1b4332] p-1 rounded-sm">
                                            <Leaf className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-base font-medium">{item.text}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Drop Targets & Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {question.dropTargets?.map(target => {
                        const droppedItemId = dragAndDropState[target.id];
                        const droppedItem = question.dragItems?.find(d => d.id === droppedItemId);

                        return (
                            <div key={target.id} className="flex flex-col gap-4">
                                <div 
                                    onDrop={(e) => handleDrop(e, target.id)} 
                                    onDragOver={handleDragOver} 
                                    className={`h-24 border-2 border-dashed border-[#1b4332] bg-[#e8ece9] flex items-center justify-center relative transition-colors ${droppedItem ? 'border-solid border-transparent bg-transparent' : ''}`}
                                >
                                    {droppedItem && (
                                        <div 
                                            draggable 
                                            onDragStart={(e) => handleDragStart(e, droppedItem.id)} 
                                            className="bg-[#66bb6a] text-white p-4 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing relative shadow-md hover:shadow-lg transition-shadow"
                                        >
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1b4332] p-1 rounded-sm">
                                                <Leaf className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="text-base font-medium">{droppedItem.text}</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[#1b4332] text-sm leading-relaxed">{target.text}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Bar */}
                <div className="mt-auto flex justify-end">
                    <button 
                        onClick={handleSubmit}
                        disabled={Object.values(dragAndDropState).some(val => val === null) || isSubmitted}
                        className="flex items-center gap-3 px-6 py-3 bg-[#c8e6c9] hover:bg-[#a5d6a7] text-[#1b4332] font-medium text-lg disabled:opacity-50 transition-colors"
                    >
                        <CornerDownLeft className="w-6 h-6" /> Submit
                    </button>
                </div>

                {/* Modal */}
                {isSubmitted && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm p-4">
                        <div className="bg-[#e8ece9] shadow-2xl max-w-xl w-full relative animate__animated animate__zoomIn pb-16">
                            <div className="flex items-center">
                                <div className="bg-[#1b4332] w-32 h-32 flex items-center justify-center shrink-0">
                                    {isCorrect ? <Leaf className="text-white w-12 h-12" /> : <XCircle className="text-white w-12 h-12" />}
                                </div>
                                <div className="px-8">
                                    <h2 className="text-4xl font-bold text-[#1b4332]">
                                        {isCorrect ? "¡Correcto!" : "¡Incorrecto!"}
                                    </h2>
                                </div>
                            </div>
                            <div className="p-8 text-[#1b4332] text-lg">
                                <p className="leading-relaxed">
                                    {isCorrect 
                                        ? "¡Excelente trabajo! Has colocado todos los elementos correctamente." 
                                        : "Algunos elementos no están en la posición correcta. ¡Sigue intentándolo!"}
                                </p>
                            </div>
                            <button 
                                onClick={handleContinue}
                                className="absolute bottom-0 right-0 w-16 h-16 bg-[#a5d6a7] hover:bg-[#81c784] transition-colors flex items-center justify-center text-[#1b4332]"
                            >
                                <ArrowRight className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (question.type === QuestionType.IMAGE_DRAG_AND_DROP) {
        return (
            <div key={key} className="w-full max-w-6xl mx-auto h-[80vh] min-h-[500px] max-h-[800px] overflow-y-auto bg-[#e8ece9] shadow-2xl flex flex-col animate__animated animate__fadeIn font-sans p-6 md:p-10 relative">
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1b4332] mb-3">Pregunta {questionNumber}.</h2>
                    <p className="text-base md:text-lg text-[#1b4332] font-bold max-w-4xl mx-auto leading-relaxed">
                        {question.questionText}
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 flex-grow">
                    {/* Left Panel - Image with Drop Targets */}
                    <div className="w-full lg:w-3/5 relative bg-white shadow-md rounded-lg overflow-hidden flex-shrink-0" style={{ minHeight: '400px' }}>
                        <img src={question.imageUrl} alt="Context" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        
                        {/* Drop Targets on Image */}
                        {question.imageDropTargets?.map(target => {
                            const droppedItemId = dragAndDropState[target.id];
                            const droppedItem = question.dragItems?.find(d => d.id === droppedItemId);

                            return (
                                <div 
                                    key={target.id}
                                    onDrop={(e) => handleDrop(e, target.id)} 
                                    onDragOver={handleDragOver}
                                    className={`absolute w-12 h-12 md:w-16 md:h-16 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-[#1b4332] bg-white/60 backdrop-blur-sm flex items-center justify-center transition-colors shadow-sm ${droppedItem ? 'border-solid border-transparent bg-transparent shadow-none' : ''}`}
                                    style={{ top: `${target.top}%`, left: `${target.left}%` }}
                                >
                                    {droppedItem && (
                                        <div 
                                            draggable 
                                            onDragStart={(e) => handleDragStart(e, droppedItem.id)} 
                                            className="bg-[#1b4332] text-white w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-shadow rounded-sm"
                                        >
                                            <span className="text-xl md:text-2xl font-bold">{droppedItem.id.replace('d', '')}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Panel - Draggable Items */}
                    <div className="w-full lg:w-2/5 flex flex-col gap-4">
                        <h3 className="text-xl font-bold text-[#1b4332] mb-2">Opciones</h3>
                        <div className="flex flex-col gap-4 overflow-y-auto pr-2" style={{ maxHeight: '500px' }}>
                            {shuffledDragItems.map(item => {
                                const isDropped = Object.values(dragAndDropState).includes(item.id);
                                
                                return (
                                    <div key={item.id} className="flex items-center gap-4 bg-white p-4 shadow-sm rounded-lg border border-gray-200">
                                        {/* Draggable Number */}
                                        <div className="shrink-0 w-12 h-12 md:w-16 md:h-16">
                                            {!isDropped ? (
                                                <div 
                                                    draggable 
                                                    onDragStart={(e) => handleDragStart(e, item.id)} 
                                                    className="bg-[#1b4332] text-white w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-shadow rounded-sm"
                                                >
                                                    <span className="text-xl md:text-2xl font-bold">{item.id.replace('d', '')}</span>
                                                </div>
                                            ) : (
                                                <div className="w-full h-full border-2 border-dashed border-gray-300 bg-gray-50 rounded-sm flex items-center justify-center">
                                                    <Check className="text-gray-400 w-6 h-6" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Text Description */}
                                        <p className="text-[#1b4332] text-sm md:text-base font-medium leading-snug">
                                            {item.text}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleSubmit}
                        disabled={Object.values(dragAndDropState).some(val => val === null) || isSubmitted}
                        className="flex items-center gap-3 px-6 py-3 bg-[#81c784] hover:bg-[#66bb6a] text-[#1b4332] font-medium text-lg disabled:opacity-50 transition-colors"
                    >
                        <CornerDownLeft className="w-6 h-6" /> Submit
                    </button>
                </div>

                {/* Modal */}
                {isSubmitted && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm p-4">
                        <div className="bg-[#e8ece9] shadow-2xl max-w-xl w-full relative animate__animated animate__zoomIn pb-16">
                            <div className="flex items-center">
                                <div className="bg-[#1b4332] w-32 h-32 flex items-center justify-center shrink-0">
                                    {isCorrect ? <Leaf className="text-white w-12 h-12" /> : <XCircle className="text-white w-12 h-12" />}
                                </div>
                                <div className="px-8">
                                    <h2 className="text-4xl font-bold text-[#1b4332]">
                                        {isCorrect ? "¡Correcto!" : "¡Incorrecto!"}
                                    </h2>
                                </div>
                            </div>
                            <div className="p-8 text-[#1b4332] text-lg">
                                <p className="leading-relaxed">
                                    {isCorrect 
                                        ? "¡Excelente trabajo! Has colocado todos los elementos correctamente." 
                                        : "Algunos elementos no están en la posición correcta. ¡Sigue intentándolo!"}
                                </p>
                            </div>
                            <button 
                                onClick={handleContinue}
                                className="absolute bottom-0 right-0 w-16 h-16 bg-[#a5d6a7] hover:bg-[#81c784] transition-colors flex items-center justify-center text-[#1b4332]"
                            >
                                <ArrowRight className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (question.caseStudy) {
        return (
            <div key={key} className="w-full max-w-5xl mx-auto h-[80vh] min-h-[500px] max-h-[800px] overflow-y-auto bg-[#e8ece9] shadow-2xl flex flex-col animate__animated animate__fadeIn font-sans p-8 md:p-12 relative" style={{ backgroundColor: '#e8ece9' }}>
                <h2 className="text-2xl font-bold text-gray-950 mb-4">Caso de Estudio y Pregunta {questionNumber}.</h2>
                
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-[#4caf50] mb-6">
                    <p className="text-lg text-gray-900 leading-relaxed">
                        {question.caseStudy}
                    </p>
                </div>

                <p className="text-lg text-gray-950 font-semibold mb-4">{question.questionText}</p>
                
                <div className="flex-grow space-y-3 mb-6">
                    {question.options?.map((option, index) => {
                        const isSelected = answer === option.text;
                        const isCorrectOption = option.isCorrect;
                        const showFeedback = isSubmitted;
                        
                        let className = "p-4 rounded-lg transition-all duration-300 border-2 ";
                        if (showFeedback) {
                            if (isCorrectOption) className += "bg-green-500 border-green-700 text-white";
                            else if (isSelected && !isCorrectOption) className += "bg-red-500 border-red-700 text-white";
                            else className += "bg-white text-gray-400 border-transparent";
                        } else {
                            className += `cursor-pointer ${isSelected ? 'bg-[#81c784] border-[#1b4332] text-white' : 'bg-white text-gray-900 border-transparent hover:border-[#81c784]'}`;
                        }

                        return (
                            <div 
                                key={index}
                                onClick={() => !isSubmitted && setAnswer(option.text)}
                                className={className}
                            >
                                {option.text}
                            </div>
                        );
                    })}
                </div>
                
                <div className="flex justify-end">
                    {isSubmitted ? (
                        <button onClick={handleContinue} className="px-8 py-3 bg-[#1b4332] text-white rounded-full font-bold shadow-lg hover:bg-[#112d21] transition-colors">
                            Continuar
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={!answer || isSubmitted} className="px-8 py-3 bg-[#4caf50] text-white rounded-full font-bold shadow-lg hover:bg-[#3e8e41] transition-colors">
                            Submit
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (question.imageUrl) {
        return (
            <div key={key} className="w-full max-w-5xl mx-auto h-[80vh] min-h-[500px] max-h-[800px] overflow-y-auto bg-[#e8ece9] shadow-2xl flex flex-col md:flex-row animate__animated animate__fadeIn font-sans">
                {/* Left Panel - Image */}
                <div className="w-full md:w-5/12 relative bg-white">
                    <img src={question.imageUrl} alt="Context" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>

                {/* Right Panel - Content */}
                <div className="w-full md:w-7/12 p-6 md:p-10 flex flex-col relative">
                    <div className="mb-6">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1b4332] mb-3">Pregunta {questionNumber}.</h2>
                        <p className="text-base md:text-lg text-[#1b4332] font-medium leading-relaxed">
                            {question.questionText}
                        </p>
                    </div>

                    <div className="flex-grow space-y-4">
                        {question.options?.map((option, index) => {
                            const isSelected = answer === option.text;
                            return (
                                <div 
                                    key={index}
                                    onClick={() => !isSubmitted && setAnswer(option.text)}
                                    className={`flex items-center gap-4 p-4 cursor-pointer transition-colors duration-300 ${isSelected ? 'bg-[#81c784]' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    <div className="shrink-0">
                                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'border-[#1b4332] bg-[#1b4332]' : 'border-[#1b4332] bg-transparent'}`}>
                                            {isSelected && <Check className="text-white w-4 h-4" />}
                                        </div>
                                    </div>
                                    <span className={`text-base md:text-lg ${isSelected ? 'text-white' : 'text-[#1b4332]'}`}>
                                        {option.text}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Bar */}
                    <div className="mt-12 flex justify-end">
                        <button 
                            onClick={handleSubmit}
                            disabled={answer === null || isSubmitted}
                            className="flex items-center gap-3 px-6 py-3 bg-[#81c784] hover:bg-[#66bb6a] text-[#1b4332] font-medium text-lg disabled:opacity-50 transition-colors"
                        >
                            <CornerDownLeft className="w-6 h-6" /> Submit
                        </button>
                    </div>

                    {/* Modal */}
                    {isSubmitted && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm p-4">
                            <div className="bg-[#e8ece9] shadow-2xl max-w-xl w-full relative animate__animated animate__zoomIn pb-16">
                                <div className="flex items-center">
                                    <div className="bg-[#1b4332] w-32 h-32 flex items-center justify-center shrink-0">
                                        {isCorrect ? <Leaf className="text-white w-12 h-12" /> : <XCircle className="text-white w-12 h-12" />}
                                    </div>
                                    <div className="px-8">
                                        <h2 className="text-4xl font-bold text-[#1b4332]">
                                            {isCorrect ? "¡Correcto!" : "¡Incorrecto!"}
                                        </h2>
                                    </div>
                                </div>
                                <div className="p-8 text-[#1b4332] text-lg">
                                    <p className="leading-relaxed">
                                        {isCorrect 
                                            ? "¡Excelente trabajo! Has elegido la respuesta correcta." 
                                            : `La respuesta correcta era: ${getCorrectAnswerText(question)}`}
                                    </p>
                                </div>
                                <button 
                                    onClick={handleContinue}
                                    className="absolute bottom-0 right-0 w-16 h-16 bg-[#a5d6a7] hover:bg-[#81c784] transition-colors flex items-center justify-center text-[#1b4332]"
                                >
                                    <ArrowRight className="w-8 h-8" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div key={key} className="w-full max-w-5xl mx-auto h-[80vh] min-h-[500px] max-h-[800px] overflow-y-auto bg-[#373b3e] shadow-2xl flex flex-col md:flex-row animate__animated animate__fadeIn">
            {/* Left Panel */}
            <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col">
                <h3 className="text-[#4caf50] text-xl font-semibold mb-4 uppercase tracking-wider">{getQuestionTypeLabel(question.type)}</h3>
                <h2 className="text-[#4caf50] text-2xl mb-8 font-light leading-snug">{question.questionText}</h2>
                
                <div className="flex-grow">
                    {renderQuestionType()}
                </div>

                {!isSubmitted && (
                    <button
                        onClick={handleSubmit}
                        disabled={answer === null && question.type !== 'DRAG_AND_DROP' && question.type !== 'TIMELINE' && question.type !== 'COMPARATIVE_CHART'}
                        className="mt-12 self-start bg-[#4caf50] hover:bg-[#388e3c] text-white font-bold py-2 px-8 rounded-full transition-colors disabled:bg-[#4a4a4a] disabled:text-[#888] disabled:cursor-not-allowed uppercase tracking-wider text-sm"
                    >
                        SUBMIT
                    </button>
                )}
            </div>

            {/* Right Panel */}
            <div className="w-full md:w-1/2 relative bg-[#2a2d2f]">
                {isSubmitted ? (
                    <div className={`absolute inset-0 p-8 md:p-12 flex flex-col justify-center ${isCorrect ? 'bg-[#388e3c]' : 'bg-[#c65b39]'} text-white animate__animated animate__fadeIn`}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-white rounded-full p-2">
                                {isCorrect ? <Check className="text-[#388e3c]" size={32} /> : <X className="text-[#c65b39]" size={32} />}
                            </div>
                            <h2 className="text-4xl font-bold">{isCorrect ? 'Correct!' : 'Wrong!'}</h2>
                        </div>
                        <p className="text-xl mb-6 font-light">
                            {isCorrect 
                                ? '¡Sí, lo lograste, elegiste la respuesta correcta. Felicitaciones, buen trabajo!' 
                                : '¡Lo siento! ¡Esta no es la respuesta correcta! ¡Mejor suerte la próxima vez!'}
                        </p>
                        {!isCorrect && (question.type === 'MULTIPLE_CHOICE' || question.type === 'FILL_IN_THE_BLANK' || question.type === 'TRUE_FALSE') && (
                            <p className="text-md opacity-90 font-light">
                                La respuesta correcta era: <span className="font-semibold">{getCorrectAnswerText(question)}</span>
                            </p>
                        )}
                        <button 
                            onClick={handleContinue} 
                            className="mt-auto self-start border-2 border-white hover:bg-white hover:text-[#373b3e] text-white font-bold py-2 px-8 rounded-full transition-colors uppercase tracking-wider text-sm"
                        >
                            CONTINUAR
                        </button>
                    </div>
                ) : (
                    <img src={`https://picsum.photos/seed/${question.id}/800/600`} alt="Context" className="w-full h-full object-cover opacity-80" />
                )}
            </div>
        </div>
    );
};

export default QuestionDisplay;
