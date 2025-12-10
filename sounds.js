class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.masterVolume = 0.4;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    playTone(frequency, duration, volume = 0.3, type = 'sine', attack = 0.01, decay = 0.1) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const now = this.audioContext.currentTime;

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * this.masterVolume, now + attack);
        gainNode.gain.exponentialRampToValueAtTime(volume * this.masterVolume * 0.7, now + attack + decay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        oscillator.start(now);
        oscillator.stop(now + duration);
    }

    playChord(frequencies, duration, volume = 0.3, type = 'sine') {
        frequencies.forEach((freq, index) => {
            setTimeout(() => this.playTone(freq, duration, volume, type), index * 50);
        });
    }

    playClick() {
        this.playTone(600, 0.06, 0.2, 'sine', 0.002, 0.015);
        // Subtle harmonic
        setTimeout(() => this.playTone(800, 0.04, 0.12, 'sine', 0.002, 0.01), 20);
    }

    playHover() {
        this.playTone(700, 0.03, 0.08, 'sine', 0.002, 0.008);
    }

    playCorrect() {
        const melody = [
            { freq: 523.25, time: 0, dur: 0.12 },    // C5
            { freq: 659.25, time: 80, dur: 0.12 },   // E5
            { freq: 783.99, time: 160, dur: 0.15 },  // G5
            { freq: 1046.50, time: 280, dur: 0.25 }  // C6
        ];

        melody.forEach(note => {
            setTimeout(() => {
                this.playTone(note.freq, note.dur, 0.35, 'triangle', 0.005, 0.03);
            }, note.time);
        });

        setTimeout(() => {
            this.playTone(2093, 0.15, 0.2, 'sine', 0.001, 0.05);
        }, 320);
    }

    playIncorrect() {
        const melody = [
            { freq: 392, time: 0, dur: 0.15 },     // G4
            { freq: 349.23, time: 100, dur: 0.15 }, // F4
            { freq: 293.66, time: 200, dur: 0.25 }  // D4
        ];

        melody.forEach(note => {
            setTimeout(() => {
                this.playTone(note.freq, note.dur, 0.3, 'sawtooth', 0.01, 0.05);
            }, note.time);
        });

        setTimeout(() => {
            this.playTone(130.81, 0.3, 0.25, 'triangle', 0.02, 0.1);
        }, 0);
    }

    playTick() {
        this.playTone(1400, 0.04, 0.18, 'square', 0.001, 0.01);
    }

    playWarningTick() {
        this.playTone(1800, 0.06, 0.25, 'square', 0.001, 0.015);
        setTimeout(() => this.playTone(1600, 0.04, 0.2, 'square', 0.001, 0.01), 40);
    }

    playGameStart() {
        const fanfare = [
            { freq: 440, time: 0, dur: 0.12 },      // A4
            { freq: 554.37, time: 100, dur: 0.12 }, // C#5
            { freq: 659.25, time: 200, dur: 0.12 }, // E5
            { freq: 880, time: 300, dur: 0.25 }     // A5
        ];

        fanfare.forEach(note => {
            setTimeout(() => {
                this.playTone(note.freq, note.dur, 0.3, 'triangle', 0.005, 0.03);
            }, note.time);
        });

        // Add power chord
        setTimeout(() => {
            this.playChord([440, 554.37, 659.25], 0.3, 0.2, 'sawtooth');
        }, 350);
    }

    playGameEnd() {
        const victory = [
            { freq: 523.25, time: 0, dur: 0.15 },    // C5
            { freq: 659.25, time: 120, dur: 0.15 },  // E5
            { freq: 783.99, time: 240, dur: 0.15 },  // G5
            { freq: 1046.50, time: 360, dur: 0.3 }   // C6
        ];

        victory.forEach(note => {
            setTimeout(() => {
                this.playTone(note.freq, note.dur, 0.35, 'triangle', 0.005, 0.04);
            }, note.time);
        });

        setTimeout(() => {
            this.playChord([523.25, 659.25, 783.99, 1046.50], 0.4, 0.25, 'sine');
        }, 400);
    }

    playPlayerJoin() {
        this.playTone(659.25, 0.1, 0.25, 'sine', 0.005, 0.02);
        setTimeout(() => this.playTone(783.99, 0.12, 0.25, 'sine', 0.005, 0.02), 80);
    }

    playPlayerLeave() {
        this.playTone(783.99, 0.1, 0.2, 'sine', 0.005, 0.02);
        setTimeout(() => this.playTone(659.25, 0.12, 0.2, 'sine', 0.005, 0.02), 80);
    }

    playRoomCreated() {
        const notes = [587.33, 659.25, 783.99]; // D5, E5, G5
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 0.28, 'triangle', 0.005, 0.03), i * 90);
        });
    }

    playCountdown(number) {
        if (number > 0) {
            this.playTone(880, 0.15, 0.3, 'square', 0.005, 0.03);
        } else {
            // GO!
            this.playChord([523.25, 659.25, 783.99], 0.25, 0.35, 'triangle');
        }
    }

    playAchievement() {
        const achievement = [
            { freq: 659.25, time: 0, dur: 0.1 },
            { freq: 783.99, time: 80, dur: 0.1 },
            { freq: 1046.50, time: 160, dur: 0.15 },
            { freq: 1318.51, time: 280, dur: 0.2 }
        ];

        achievement.forEach(note => {
            setTimeout(() => {
                this.playTone(note.freq, note.dur, 0.3, 'sine', 0.003, 0.02);
            }, note.time);
        });
    }

    playNotification() {
        this.playTone(1046.50, 0.08, 0.25, 'sine', 0.003, 0.02);
        setTimeout(() => this.playTone(1318.51, 0.1, 0.25, 'sine', 0.003, 0.02), 70);
    }

    playError() {
        this.playTone(200, 0.2, 0.3, 'sawtooth', 0.01, 0.05);
        setTimeout(() => this.playTone(150, 0.25, 0.25, 'sawtooth', 0.01, 0.06), 100);
    }

    playSuccess() {
        this.playChord([523.25, 659.25, 783.99], 0.2, 0.28, 'triangle');
    }

    playWhoosh() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const now = this.audioContext.currentTime;

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.25);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15 * this.masterVolume, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        oscillator.start(now);
        oscillator.stop(now + 0.25);
    }

    playNewQuestion() {
        // Gentle ascending tone
        this.playTone(440, 0.08, 0.18, 'sine', 0.005, 0.02);
        setTimeout(() => this.playTone(554.37, 0.1, 0.2, 'sine', 0.005, 0.025), 60);
    }

    playCoin() {
        this.playTone(1046.50, 0.08, 0.25, 'square', 0.002, 0.02);
        setTimeout(() => this.playTone(1318.51, 0.1, 0.25, 'square', 0.002, 0.02), 50);
    }

    playLevelUp() {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.12, 0.3, 'triangle', 0.003, 0.025), i * 60);
        });
    }

    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    mute() {
        this.enabled = false;
    }

    unmute() {
        this.enabled = true;
    }
}

const soundManager = new SoundManager();
