export type QuoteLength = "short" | "medium" | "long";

interface Quote { text: string; author: string }

// short: ~60–130 chars · medium: ~131–250 chars · long: ~251–450 chars
const QUOTES: Record<QuoteLength, Quote[]> = {
  short: [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
    { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
    { text: "You miss one hundred percent of the shots you don't take.", author: "Wayne Gretzky" },
    { text: "Whether you think you can or think you can't, you're right.", author: "Henry Ford" },
    { text: "An unexamined life is not worth living.", author: "Socrates" },
    { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
    { text: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
    { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
    { text: "You become what you believe.", author: "Oprah Winfrey" },
    { text: "Act as if what you do makes a difference. It does.", author: "William James" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "The best time to plant a tree was twenty years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt" },
    { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
    { text: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou" },
  ],
  medium: [
    { text: "Two roads diverged in a wood, and I took the one less traveled by, and that has made all the difference.", author: "Robert Frost" },
    { text: "You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose. You're on your own.", author: "Dr. Seuss" },
    { text: "Never let the fear of striking out keep you from playing the game. Babe Ruth struck out thousands of times before hitting a home run.", author: "Babe Ruth" },
    { text: "If you set your goals ridiculously high and it's a failure, you will fail above everyone else's success. Always aim higher than you think possible.", author: "James Cameron" },
    { text: "You don't have to be great to start, but you have to start to be great. Every expert was once a beginner who refused to quit.", author: "Zig Ziglar" },
    { text: "People often say that motivation doesn't last. Well, neither does bathing, that's why we recommend it daily. Keep pushing forward.", author: "Zig Ziglar" },
    { text: "If life were predictable it would cease to be life, and be without flavor. Embrace the unexpected and find the beauty in every challenge.", author: "Eleanor Roosevelt" },
    { text: "The only impossible journey is the one you never begin. Take that first step and watch the impossible become possible before your eyes.", author: "Tony Robbins" },
    { text: "In this life we cannot do great things. We can only do small things with great love. Every act of kindness ripples further than we know.", author: "Mother Teresa" },
    { text: "Happiness is not something ready made. It comes from your own actions and the choices you make each and every single day of your life.", author: "Dalai Lama" },
    { text: "Your time is limited, so don't waste it living someone else's life. Don't be trapped by dogma, which is living with the results of other people's thinking.", author: "Steve Jobs" },
    { text: "Not how long, but how well you have lived is the main thing. A single day among those who have examined things is worth more than a lazy life.", author: "Seneca" },
    { text: "I learned that courage was not the absence of fear, but the triumph over it. The brave man is not he who does not feel afraid, but he who conquers that fear.", author: "Nelson Mandela" },
    { text: "The purpose of our lives is to be happy. Happiness is not something you find, it is something you create through your daily habits and actions.", author: "Dalai Lama" },
    { text: "Life is not measured by the number of breaths we take, but by the moments that take our breath away. Live fully in every single moment you are given.", author: "Maya Angelou" },
  ],
  long: [
    { text: "It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood.", author: "Theodore Roosevelt" },
    { text: "Darkness cannot drive out darkness: only light can do that. Hate cannot drive out hate: only love can do that. We must learn to live together as brothers or perish together as fools. The time is always right to do what is right.", author: "Martin Luther King Jr." },
    { text: "Twenty years from now you will be more disappointed by the things that you didn't do than by the ones you did do. So throw off the bowlines. Sail away from the safe harbor. Catch the trade winds in your sails. Explore. Dream. Discover.", author: "Mark Twain" },
    { text: "Here is the test to find whether your mission on earth is finished. If you're alive, it isn't. Every single day you wake up is a new opportunity to pursue your purpose and make a meaningful contribution to the world and the people around you.", author: "Richard Bach" },
    { text: "Do not be embarrassed by your failures. Learn from them and start again. Failure is simply the opportunity to begin again, this time more intelligently. The most successful people in the world have all experienced setbacks and learned from each one.", author: "Richard Branson" },
    { text: "You've gotta dance like there's nobody watching, love like you'll never be hurt, sing like there's nobody listening, and live like it's heaven on earth. Embrace every moment with full presence, gratitude and an open heart ready to receive life's gifts.", author: "William W. Purkey" },
    { text: "I have learned over the years that when one's mind is made up, this diminishes fear; knowing what must be done does away with fear. When you commit fully to a path, the universe conspires to help you achieve your deepest and most heartfelt goals.", author: "Rosa Parks" },
    { text: "To laugh often and much; to win the respect of intelligent people and the affection of children; to earn the appreciation of honest critics; to appreciate beauty; to find the best in others; to leave the world a little better place than you found it.", author: "Ralph Waldo Emerson" },
  ],
};

export function getQuote(length: QuoteLength): { words: string[]; author: string } {
  const pool = QUOTES[length];
  const quote = pool[Math.floor(Math.random() * pool.length)];
  return { words: quote.text.split(" "), author: quote.author };
}
