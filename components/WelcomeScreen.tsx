import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';

interface WelcomeScreenProps {
    onStart: (name: string, lastName: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');

    const handleStart = () => {
        if (name.trim() === '' || lastName.trim() === '') {
            setError('Por favor, introduce tu nombre y apellido para comenzar.');
            return;
        }
        setError('');
        onStart(name.trim(), lastName.trim());
    };

    return (
        <div className="relative w-full max-w-4xl mx-auto bg-[#373b3e] p-10 md:p-16 shadow-2xl animate__animated animate__fadeIn">
            <div className="absolute top-8 right-8 text-[#4caf50]">
                <Paperclip size={48} className="opacity-80" />
            </div>
            <div className="border-b border-[#4caf50] w-16 mb-6 pb-2">
                <span className="text-[#4caf50] text-xl">01</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light text-[#4caf50] mb-6">Examen del Pentateuco</h1>
            <p className="text-white text-lg mb-10 font-light">
                Esta plantilla de prueba contiene preguntas sobre los libros de Génesis a Deuteronomio. ¡Disfruta!
            </p>
            
            <div className="max-w-md space-y-6 text-left">
                <div>
                    <label htmlFor="studentName" className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                    <input
                        type="text"
                        id="studentName"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (error) setError('');
                        }}
                        placeholder="Escribe tu nombre"
                        className="w-full p-3 bg-transparent border-b-2 border-gray-500 text-white placeholder-gray-500 focus:border-[#4caf50] outline-none transition"
                    />
                </div>
                <div>
                    <label htmlFor="studentLastName" className="block text-sm font-medium text-gray-300 mb-1">Apellido</label>
                    <input
                        type="text"
                        id="studentLastName"
                        value={lastName}
                        onChange={(e) => {
                            setLastName(e.target.value);
                            if (error) setError('');
                        }}
                        placeholder="Escribe tu apellido"
                        className="w-full p-3 bg-transparent border-b-2 border-gray-500 text-white placeholder-gray-500 focus:border-[#4caf50] outline-none transition"
                    />
                </div>
                {error && <p className="text-orange-400 text-sm mt-2">{error}</p>}
            </div>

            <button
                onClick={handleStart}
                className="mt-12 bg-[#4caf50] hover:bg-[#388e3c] text-white font-bold py-3 px-10 rounded-full text-sm uppercase tracking-wider transition-colors"
            >
                Comenzar Examen
            </button>
        </div>
    );
};

export default WelcomeScreen;