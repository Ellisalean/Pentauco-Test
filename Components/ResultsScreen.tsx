import React, { useState, useEffect } from 'react';
import type { Question, UserAnswer } from '../types';
import { QuestionType } from '../types';
import { Download, Send, RotateCcw, Shield } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ResultsScreenProps {
    studentName: string;
    studentLastName: string;
    score: number;
    totalPoints: number;
    onRestart: () => void;
    questions: Question[];
    userAnswers: UserAnswer[];
}

const getCorrectAnswerText = (question: Question): string => {
    switch (question.type) {
        case QuestionType.MULTIPLE_CHOICE:
            return question.options?.find(o => o.isCorrect)?.text || 'N/A';
        case QuestionType.FILL_IN_THE_BLANK:
            return question.correctAnswer || 'N/A';
        case QuestionType.TRUE_FALSE:
            return question.correctBoolean ? 'Verdadero' : 'Falso';
        case QuestionType.OPEN_ENDED:
            return 'Respuesta abierta (evaluación manual/palabras clave)';
        default:
            return 'Ver respuestas detalladas.';
    }
};

const formatUserAnswer = (question: Question, answer: UserAnswer): string | JSX.Element => {
    if (answer === null || answer === undefined) {
        return <span className="text-gray-500 italic">No respondida</span>;
    }

    switch (question.type) {
        case QuestionType.MULTIPLE_CHOICE:
        case QuestionType.FILL_IN_THE_BLANK:
        case QuestionType.OPEN_ENDED:
            return String(answer);
        case QuestionType.TRUE_FALSE:
            return answer ? 'Verdadero' : 'Falso';
        case QuestionType.DRAG_AND_DROP:
             if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
                return (
                    <ul className="list-disc pl-5 mt-1 text-gray-400">
                        {question.dropTargets?.map(target => (
                            <li key={target.id}>
                                <span className="font-medium text-gray-300">{target.text}:</span> {(answer as Record<string, string>)[target.id] || 'Sin respuesta'}
                            </li>
                        ))}
                    </ul>
                );
            }
            return JSON.stringify(answer);
        case QuestionType.IMAGE_DRAG_AND_DROP:
             if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
                return (
                    <ul className="list-disc pl-5 mt-1 text-gray-400">
                        {question.imageDropTargets?.map(target => {
                            const dragItem = question.dragItems?.find(d => d.id.replace('d', '') === target.id.replace('t', ''));
                            return (
                                <li key={target.id}>
                                    <span className="font-medium text-gray-300">Posición {target.id.replace('t', '')}:</span> {(answer as Record<string, string>)[target.id] || 'Sin respuesta'}
                                </li>
                            );
                        })}
                    </ul>
                );
            }
            return JSON.stringify(answer);
        case QuestionType.TIMELINE:
             if (Array.isArray(answer)) {
                return (
                    <ol className="list-decimal pl-5 mt-1 text-gray-400">
                        {(answer as string[]).map((eventText, index) => (
                            <li key={index}>{eventText}</li>
                        ))}
                    </ol>
                );
            }
            return JSON.stringify(answer);
        case QuestionType.COMPARATIVE_CHART:
             if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
                return (
                     <ul className="list-disc pl-5 mt-1 text-gray-400">
                        {question.chartItems?.map(item => (
                             <li key={item.id}>
                                <span className="font-medium text-gray-300">{item.description}:</span> {(answer as Record<string, string>)[item.id] || 'Sin asignar'}
                             </li>
                        ))}
                     </ul>
                );
            }
            return JSON.stringify(answer);
        default:
            return JSON.stringify(answer);
    }
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ studentName, studentLastName, score, totalPoints, onRestart, questions, userAnswers }) => {
    const percentage = Math.round((score / totalPoints) * 100);
    const isSuccess = percentage >= 70;
    
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState<boolean | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [token, setToken] = useState<string>('');
    const [currentDate, setCurrentDate] = useState<string>('');

    useEffect(() => {
        const date = new Date();
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
        const randomHex = Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0');
        const status = isSuccess ? 'A' : 'F';
        setToken(`STL-05-${dateStr}${timeStr}-${status}-${randomHex}`);

        setCurrentDate(date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }));
    }, [isSuccess]);

    const handleDownloadPDF = async () => {
        const element = document.getElementById('results-content');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Resultados_Pentateuco_${studentName}_${studentLastName}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Hubo un error al generar el PDF.');
        }
    };

    const handleSendEmail = async () => {
        setIsSending(true);
        setSendSuccess(null);
        setErrorMessage(null);

        const formspreeEndpoint = 'https://formspree.io/f/xaqpqrny';

        // Generate summary for email
        let answersSummary = '';
        questions.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            let isCorrect = false;
            if (q.type === QuestionType.MULTIPLE_CHOICE) {
                 isCorrect = q.options?.find(opt => opt.text === userAnswer)?.isCorrect || false;
            } else if (q.type === QuestionType.FILL_IN_THE_BLANK) {
                isCorrect = typeof userAnswer === 'string' && userAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
            } else if (q.type === QuestionType.TRUE_FALSE) {
                isCorrect = userAnswer === q.correctBoolean;
            } else if (q.type === QuestionType.OPEN_ENDED) {
                if (typeof userAnswer === 'string' && q.keywords) {
                    const lowerAnswer = userAnswer.toLowerCase();
                    isCorrect = q.keywords.some(keyword => lowerAnswer.includes(keyword.toLowerCase()));
                }
            }

            answersSummary += `${index + 1}. ${q.questionText}\n`;
            answersSummary += `Tu respuesta: ${JSON.stringify(userAnswer)}\n`;
            if (!isCorrect && (q.type === 'MULTIPLE_CHOICE' || q.type === 'FILL_IN_THE_BLANK' || q.type === 'TRUE_FALSE' || q.type === 'OPEN_ENDED')) {
                answersSummary += `Respuesta correcta: ${getCorrectAnswerText(q)}\n`;
            }
            answersSummary += '\n';
        });

        try {
            const response = await fetch(formspreeEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    subject: `Resultados de Examen: El Pentateuco - ${studentName} ${studentLastName}`,
                    studentName: `${studentName} ${studentLastName}`,
                    course: 'El Pentateuco',
                    score: `${score} / ${totalPoints}`,
                    percentage: `${percentage}%`,
                    status: isSuccess ? 'APROBADO' : 'REPROBADO',
                    token: token,
                    answersSummary: answersSummary
                }),
            });

            if (response.ok) {
                setSendSuccess(true);
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.error || 'Hubo un error al enviar la prueba a Formspree.');
                setSendSuccess(false);
            }
        } catch (error: any) {
            console.error('Error sending email:', error);
            setErrorMessage(error.message || 'Error de conexión al enviar el correo.');
            setSendSuccess(false);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden font-sans animate__animated animate__fadeIn">
            <div id="results-content" className="bg-white pb-12">
                {/* Header */}
                <div className="bg-[#1a3673] text-white py-12 px-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-32 h-32 mb-6 flex items-center justify-center">
                            <img 
                                src="https://cdn.myportfolio.com/d435fa58-d32c-4141-8a15-0f2bfccdea41/1ac05fb8-e508-4c03-b550-d2b907caadbd_rw_600.png?h=7572d326e4292f32557ac73606fd0ece" 
                                alt="Logo Seminario" 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                            />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3 tracking-wide">Latin Theological Seminary</h1>
                        <p className="text-xs md:text-sm tracking-[0.25em] uppercase opacity-80 font-medium">Certificado Oficial de Resultados</p>
                    </div>
                </div>

                {/* Body */}
                <div className="px-8 md:px-16 pt-12 text-center">
                    <p className="text-gray-500 italic mb-4 text-lg">Se otorga el presente reconocimiento a:</p>
                    <h2 className="text-5xl md:text-6xl font-serif font-bold mb-16 text-gray-900 tracking-tight">{studentName} {studentLastName}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        <div className="bg-[#fafafa] p-6 rounded-lg border border-gray-100 shadow-sm text-left">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Materia</p>
                            <p className="font-medium text-gray-800 text-lg">El Pentateuco</p>
                        </div>
                        <div className="bg-[#fafafa] p-6 rounded-lg border border-gray-100 shadow-sm text-left">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Calificación</p>
                            <p className={`text-2xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>{score} / {totalPoints}</p>
                        </div>
                        <div className="bg-[#fafafa] p-6 rounded-lg border border-gray-100 shadow-sm text-left">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Estado</p>
                            <p className={`text-lg font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>{isSuccess ? 'APROBADO' : 'REPROBADO'}</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Token de Verificación Único</p>
                        <div className="bg-[#111111] text-white font-mono text-sm py-3 px-8 rounded inline-block tracking-[0.2em] shadow-inner">
                            {token}
                        </div>
                        <p className="text-xs text-gray-400 mt-4">{currentDate}</p>
                    </div>
                </div>
            </div>

            {/* Footer / Buttons */}
            <div className="bg-white px-8 pb-12 flex flex-col items-center">
                <div className="flex flex-wrap justify-center gap-6 w-full mt-4">
                    <button 
                        onClick={handleSendEmail} 
                        disabled={isSending || sendSuccess === true} 
                        className="bg-[#1a3673] hover:bg-blue-900 text-white font-medium py-3 px-8 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        {isSending ? 'Enviando...' : sendSuccess ? '¡Enviado!' : 'Enviar Resultados al Profesor'}
                    </button>
                    <button 
                        onClick={handleDownloadPDF} 
                        className="bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-50 font-medium py-3 px-8 rounded-full transition-colors flex items-center gap-2 shadow-sm"
                    >
                        Descargar PDF
                    </button>
                    <button 
                        onClick={onRestart} 
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-8 rounded-full transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <RotateCcw size={18} />
                        Repetir Prueba
                    </button>
                </div>
                {sendSuccess === false && (
                    <p className="text-red-500 mt-6 text-sm">{errorMessage || 'Hubo un error al enviar la prueba.'}</p>
                )}
                {sendSuccess === true && (
                    <p className="text-green-600 mt-6 text-sm font-medium">¡Resultados enviados correctamente!</p>
                )}
            </div>
        </div>
    );
};

export default ResultsScreen;