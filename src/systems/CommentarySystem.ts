export class CommentarySystem {
  public ttsEnabled: boolean = false;
  private tickerEl: HTMLElement | null = null;
  private lastSpokenTime: number = 0;

  constructor() {
    this.tickerEl = document.getElementById('commentary-text');
  }

  public announce(text: string, priority: 'low' | 'normal' | 'high' = 'normal'): void {
    if (this.tickerEl) {
      this.tickerEl.textContent = `🎙️ ${text}`;
      const bar = document.getElementById('commentary-bar');
      if (bar) {
        bar.classList.remove('pulse');
        void bar.offsetWidth;
        bar.classList.add('pulse');
      }
    }

    if (!this.ttsEnabled || !('speechSynthesis' in window)) return;

    const now = performance.now();
    if (priority === 'low' && now - this.lastSpokenTime < 3800) return;
    if (priority === 'normal' && now - this.lastSpokenTime < 2200) return;

    try {
      if (priority === 'high') {
        window.speechSynthesis.cancel();
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ko-KR';
      utter.rate = 1.16;
      utter.pitch = priority === 'high' ? 1.15 : 1.04;
      window.speechSynthesis.speak(utter);
      this.lastSpokenTime = now;
    } catch {
      // Ignore TTS errors on restricted browsers
    }
  }

  public toggleTTS(): boolean {
    this.ttsEnabled = !this.ttsEnabled;
    if (this.ttsEnabled) {
      this.announce('한국어 음성 중계 해설이 활성화되었습니다!', 'high');
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return this.ttsEnabled;
  }
}
