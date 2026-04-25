const { Module } = require('../main');
const config = require('../config');

// Set isPrivateBot based on config.MODE
const isPrivateBot = config.MODE !== 'public';

// Map to store active Math games by chat ID
const activeMathGames = new Map();

// Constants for game
const DEFAULT_QUESTION_TIMEOUT = 15 * 1000; // 15 seconds
const STREAK_BONUS_THRESHOLD = 3; // Number of consecutive correct answers for a streak bonus
const STREAK_BONUS_POINTS = 10; // Points awarded for a streak
const ROUND_BREAK_DURATION = 3 * 1000; // 3 seconds before next question (after a correct answer)
const GAME_SESSION_DURATION = 2 * 60 * 1000; // 2 minutes for the entire game session

const DIFFICULTY_MULTIPLIERS = {
    'easy': 5,
    'medium': 10,
    'hard': 15
};

// Define timeouts per difficulty
const DIFFICULTY_TIMEOUTS = {
    'easy': 15 * 1000, // 15 seconds for easy
    'medium': 20 * 1000, // 20 seconds for medium
    'hard': 30 * 1000 // 30 seconds for hard
};


// --- MathGame Class ---
class MathGame {
    constructor(jid, client) {
        this.jid = jid;
        this.client = client;
        this.currentProblem = null;
        this.correctAnswer = null;
        this.difficulty = 'easy'; // Default difficulty, can be set by command
        this.currentQuestionTimeout = DEFAULT_QUESTION_TIMEOUT; // Store active timeout for current question
        this.questionTimer = null; // Timer for the current question
        this.gameEndTimer = null; // Timer for the entire game session duration
        this.questionStartTime = 0; // When the current question started
        this.gameSessionStartTime = 0; // When the entire game session started
        this.isActive = false; // Is a game session active (multiple rounds)
        this.isQuestionActive = false; // Is a specific question currently waiting for an answer
        this.leaderboard = new Map(); // { userId: { username: '...', score: N, correctAnswers: N, totalQuestions: N, streak: N } }
        this.answeredUsers = new Set(); // Users who have already submitted a guess for the *current* question
        this.questionCounter = 0; // Tracks number of questions in current session
    }

    // Helper to format JID for mentions
    mentionjid(jid) {
        return '@' + jid.split('@')[0];
    }

    // Generates a math problem based on difficulty
    generateMathProblem(difficulty) {
        let problem = '';
        let answer = 0;
        let a, b, op;

        switch (difficulty) {
            case "easy":
                a = Math.floor(Math.random() * 9) + 1; // 1-9
                b = Math.floor(Math.random() * 9) + 1; // 1-9
                op = randomChoice(["+", "-", "×"]);

                problem = `${a} ${op} ${b}`;
                answer = evaluateMathString(problem.replace("×", "*"));
                break;

            case "medium":
                a = Math.floor(Math.random() * 41) + 10; // 10-50
                b = Math.floor(Math.random() * 20) + 1;  // 1-20
                op = randomChoice(["+", "-", "×", "÷"]);

                problem = `${a} ${op} ${b}`;
                let tempAnswer = evaluateMathString(problem.replace("×", "*").replace("÷", "/"));
                answer = Math.round(tempAnswer * 100) / 100; // Round to 2 decimals
                break;

            case "hard":
                a = Math.floor(Math.random() * 4) + 2; // 2-5
                b = Math.floor(Math.random() * 4) + 2; // 2-5
                op = randomChoice(["power", "sqrt"]); // Using strings for ops to avoid eval with complex syntax

                if (op === "power") {
                    problem = `${a}^${b}`;
                    answer = Math.pow(a, b);
                } else { // sqrt
                    let base = Math.floor(Math.random() * 7) + 2; // Base for sqrt (2-8)
                    problem = `√${base * base}`; // e.g., √64
                    answer = base;
                }
                break;

            default: // Defaults to easy
                return this.generateMathProblem('easy');
        }

        return { problem: problem, answer: answer };
    }

    // Starts a new math problem round (individual question)
    async startNewQuestion() {
        this.resetQuestionState(); // Reset state for a new question (clears question timer, answeredUsers for *this* question)
        this.isQuestionActive = true; // Mark a question as active

        this.questionCounter++; // Increment question counter for the session

        const { problem, answer } = this.generateMathProblem(this.difficulty);
        this.currentProblem = problem;
        this.correctAnswer = answer;

        // Set the current question's timeout based on difficulty
        this.currentQuestionTimeout = DIFFICULTY_TIMEOUTS[this.difficulty] || DEFAULT_QUESTION_TIMEOUT;

        const difficultyEmoji = { 'easy': '👶', 'medium': '🧑', 'hard': '🏋️' }[this.difficulty] || '';

        const questionMessage = `
🧮 *Math Challenge* (Question ${this.questionCounter}) | (${difficultyEmoji} ${this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1)})
Solve: *${this.currentProblem}*
⏳ Reply in ${this.currentQuestionTimeout / 1000}s!
        `.trim();

        await this.client.sendMessage(this.jid, { text: questionMessage });

        this.questionStartTime = Date.now();
        this.startQuestionTimeoutTimer(); // Start timer for this specific question
        // console.log(`[Math Game] New question started: ${this.currentProblem}, Answer: ${this.correctAnswer}, Difficulty: ${this.difficulty}, Timeout: ${this.currentQuestionTimeout / 1000}s`); // Removed log
    }

    // Handles a player's answer
    async handleAnswer(answer, userId, username) {
        // console.log(`[Math Game] Answer received from ${username} (${userId}): ${answer}`); // Removed log

        if (!this.isActive || !this.isQuestionActive || this.currentProblem === null) {
            // console.log("[Math Game] No active game session or question."); // Removed log
            return; // Don't send a reply if no game or question is active
        }

        // --- Prevent multiple answers for the same question ---
        if (this.answeredUsers.has(userId)) {
            // console.log(`[Math Game] ${username} already submitted a guess for this question.`); // Removed log
            await this.client.sendMessage(this.jid, {
                text: `_You already submitted a guess for this problem, ${this.mentionjid(userId)}. Wait for the next question or for others to answer!_`,
                mentions: [userId]
            });
            return; // Exit as user already answered this specific question
        }

        const parsedAnswer = parseFloat(answer.trim());
        if (isNaN(parsedAnswer)) {
            // Do NOT add to answeredUsers or increment totalQuestions for invalid formats.
            const player = this.getOrCreatePlayerStats(userId, username); // Ensure player exists
            player.streak = 0; // Reset streak on invalid format
            // console.log(`[Math Game] Invalid answer format from ${username}. Score: ${player.score}`); // Removed log
            await this.client.sendMessage(this.jid, {
                text: `_Please reply with a number, ${this.mentionjid(userId)}. Your score: *${player.score}*._`,
                mentions: [userId]
            });
            return; // Exit, as it wasn't a valid numerical attempt
        }

        // Only add to answeredUsers and increment totalQuestions IF it's a valid number.
        this.answeredUsers.add(userId); // Mark user as having submitted a VALID guess for THIS question.

        const roundedUserAnswer = Math.round(parsedAnswer * 100) / 100;
        const roundedCorrectAnswer = Math.round(this.correctAnswer * 100) / 100;

        const playerStats = this.getOrCreatePlayerStats(userId, username);
        playerStats.totalQuestions++; // Increment totalQuestions for any valid numeric attempt


        if (roundedUserAnswer === roundedCorrectAnswer) {
            this.clearQuestionTimeoutTimer(); // Stop timer as question is answered
            this.isQuestionActive = false; // Immediately set to false to lock out other answers

            const timeTaken = Date.now() - this.questionStartTime;
            let basePoints = DIFFICULTY_MULTIPLIERS[this.difficulty] || 5;
            let speedBonus = Math.floor(Math.max(0, (this.currentQuestionTimeout - timeTaken) / 1000));

            let totalPoints = basePoints + speedBonus;
            // console.log(`[Math Game] Correct answer by ${username}. Base: ${basePoints}, Speed Bonus: ${speedBonus}, Total Points (before streak): ${totalPoints}`); // Removed log

            playerStats.correctAnswers++;
            playerStats.streak++;

            if (playerStats.streak > 0 && playerStats.streak % STREAK_BONUS_THRESHOLD === 0) {
                totalPoints += STREAK_BONUS_POINTS;
                await this.client.sendMessage(this.jid, { text: `🔥 ${this.mentionjid(userId)} is on a ${playerStats.streak}-solve streak! (+${STREAK_BONUS_POINTS} bonus points!)`, mentions: [userId] });
                // console.log(`[Math Game] ${username} hit a streak! Added ${STREAK_BONUS_POINTS} bonus points.`); // Removed log
            }

            playerStats.score += totalPoints;
            // console.log(`[Math Game] ${username}'s new total score: ${playerStats.score}`); // Removed log

            const message = `✅ ${this.mentionjid(userId)} got it! *${this.correctAnswer}* is correct! (+${totalPoints} points${speedBonus > 0 ? ` +${speedBonus} speed bonus!` : ''}). Your total score: *${playerStats.score}*`;

            await this.client.sendMessage(this.jid, { text: message, mentions: [userId] });

            // Automatically start next question after a short delay, IF the overall game timer hasn't ended
            if (this.isActive) { // Check if game is still active before starting next round
                setTimeout(async () => {
                    await this.endRound(); // Moves to next question
                }, ROUND_BREAK_DURATION);
            }
            return; // Exit after correct answer is handled

        } else {
            playerStats.streak = 0; // Reset streak on incorrect guess
            // console.log(`[Math Game] Incorrect answer from ${username}. Score: ${playerStats.score}`); // Removed log
            await this.client.sendMessage(this.jid, {
                text: `❌ _Wrong, ${this.mentionjid(userId)}!_ Your total score: *${playerStats.score}*`,
                mentions: [userId]
            });
            return; // Continue waiting for another answer if wrong
        }
    }

    // Helper to get or create player stats
    getOrCreatePlayerStats(userId, username) {
        if (!this.leaderboard.has(userId)) {
            this.leaderboard.set(userId, { userId: userId, username: username, score: 0, correctAnswers: 0, totalQuestions: 0, streak: 0 });
        }
        return this.leaderboard.get(userId);
    }

    // Starts the timeout timer for the current question
    startQuestionTimeoutTimer() {
        this.clearQuestionTimeoutTimer();
        this.questionTimer = setTimeout(async () => {
            // console.log(`[Math Game] Current question timed out for ${this.jid}`); // Removed log
            // When a question times out, it ends the entire game session
            await this.endGame('timeout');
        }, this.currentQuestionTimeout);
    }

    // Clears the current question timeout timer
    clearQuestionTimeoutTimer() {
        if (this.questionTimer) {
            clearTimeout(this.questionTimer);
            this.questionTimer = null;
        }
    }

    // Starts the overall game session timer
    startGameSessionTimer() {
        this.clearGameSessionTimer();
        this.gameSessionStartTime = Date.now();
        this.gameEndTimer = setTimeout(async () => {
            // console.log(`[Math Game] Overall game session for ${this.jid} ended automatically after ${GAME_SESSION_DURATION / 1000} seconds.`); // Removed log
            await this.endGame('game_timeout');
        }, GAME_SESSION_DURATION);
    }

    // Clears the overall game session timer
    clearGameSessionTimer() {
        if (this.gameEndTimer) {
            clearTimeout(this.gameEndTimer);
            this.gameEndTimer = null;
        }
    }

    // Resets state for a new question only (not ending the whole game)
    resetQuestionState() {
        this.clearQuestionTimeoutTimer(); // Clear specific question timer
        this.currentProblem = null;
        this.correctAnswer = null;
        this.questionStartTime = 0;
        this.answeredUsers.clear(); // Reset for each new question
        this.isQuestionActive = false; // Ensure it's false before a new question starts
    }

    // Ends current question round and moves to next question
    async endRound() {
        this.resetQuestionState(); // Clean up current question
        // Check if the game session is still active before starting a new question
        if (this.isActive) {
            await this.startNewQuestion(); // Automatically start the next question
        } else {
            // console.log("[Math Game] Game session not active, not starting new question after round end."); // Removed log
        }
    }

    // Ends the *entire* game session and shows the overall summary
    async endGame(reason = 'manual') {
        // console.log(`[Math Game] Ending game for ${this.jid} due to: ${reason}`); // Removed log
        if (!this.isActive) {
            // console.log("[Math Game] endGame called but game not active. Returning."); // Removed log
            return;
        }

        this.isActive = false; // Mark entire game session as inactive
        this.isQuestionActive = false; // Mark any current question as inactive immediately
        this.clearQuestionTimeoutTimer(); // Clear any active question timer
        this.clearGameSessionTimer(); // Clear the overall game session timer
        this.questionCounter = 0; // Reset question counter for next full session

        let summaryMessage = '';
        if (reason === 'timeout') {
            summaryMessage += `⏰ *Question Timed Out!* The correct answer was *${this.currentProblem || 'N/A'}*.\n\n`;
        } else if (reason === 'game_timeout') {
            summaryMessage += `🎉 *Game Over!* The Math Challenge automatically ended after ${GAME_SESSION_DURATION / 1000 / 60} minutes.\n\n`;
        }
        summaryMessage += `🏆 *Math Challenge Results!* 🏆\n\n`;

        const sortedPlayers = Array.from(this.leaderboard.values()).sort((a, b) => b.score - a.score);
        let mentions = [];

        if (sortedPlayers.length > 0) {
            summaryMessage += `*Leaderboard:*\n`;
            sortedPlayers.forEach((player, index) => {
                const accuracy = player.totalQuestions > 0 ? ((player.correctAnswers / player.totalQuestions) * 100).toFixed(0) : 0;
                summaryMessage += `${index + 1}️⃣ ${this.mentionjid(player.userId)}: *${player.score}* points (${player.correctAnswers}/${player.totalQuestions} correct, ${accuracy}% accuracy)\n`;
                if (player.userId) mentions.push(player.userId);
            });
        } else {
            summaryMessage += `_No one participated in this challenge._\n`;
        }
        summaryMessage += `\n_To start a new challenge, use_ \`.math [difficulty]\` _or_ \`.math easy\`.`;

        await this.client.sendMessage(this.jid, { text: summaryMessage, mentions });
        // console.log(`[Math Game] End game summary sent to ${this.jid} with mentions: ${mentions.join(', ')}`); // Removed log

        // Clear the leaderboard ONLY after the summary has been sent
        this.leaderboard.clear();
        activeMathGames.delete(this.jid); // Remove game instance from active map after the entire session ends.
        // console.log(`[Math Game] Game for ${this.jid} deleted from activeMathGames.`); // Removed log
    }
}

// --- Helper Functions ---

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Safer evaluation function for arithmetic operations
function evaluateMathString(expression) {
    try {
        // Basic check to ensure only numbers, operators, parentheses, and spaces are present
        if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
            // console.error("Math expression contains invalid characters:", expression); // Removed log
            return NaN;
        }
        // Use Function constructor for evaluation, but with caution
        // Ensure inputs to this function are controlled and sanitized upstream
        return new Function('return ' + expression)();
    } catch (e) {
        // console.error("Error evaluating math expression:", expression, e); // Removed log
        return NaN;
    }
}

// --- Module Definitions ---

// Command to start a Math game
Module({
    pattern: 'math ?(.*)',
    fromMe: isPrivateBot,
    desc: 'Starts a new Math challenge. Difficulties: easy (default), medium, hard.',
    use : "game"
}, async (message, match) => {
    const jid = message.jid;
    // console.log(`[Math Game] '.math' command received in ${jid}`); // Removed log

    if (activeMathGames.has(jid)) {
        // console.log(`[Math Game] Game already active in ${jid}.`); // Removed log
        return await message.sendReply('_A Math challenge is already active in this chat. Please answer the current question or wait for it to time out._');
    }

    const difficultyInput = match[1] ? match[1].toLowerCase() : 'easy';
    if (!DIFFICULTY_MULTIPLIERS.hasOwnProperty(difficultyInput)) {
        // console.log(`[Math Game] Invalid difficulty: ${difficultyInput}.`); // Removed log
        const validDifficulties = Object.keys(DIFFICULTY_MULTIPLIERS).join(', ');
        return await message.sendReply(`_Invalid difficulty. Please choose from: *${validDifficulties}*._`);
    }

    const game = new MathGame(jid, message.client);
    activeMathGames.set(jid, game);
    game.isActive = true; // Mark the game session as active
    game.difficulty = difficultyInput; // Set the initial difficulty for the session

    await message.sendReply('_Starting Math challenge! Good luck! The game will automatically end after 2 minutes._');
    game.startGameSessionTimer(); // Start the overall game timer
    await game.startNewQuestion(); // Start the first question
});

// Event listener for text messages to handle answers
Module({
    on: 'text',
    fromMe: false,
    use: 'game'
}, async (message) => {
    const jid = message.jid;
    const game = activeMathGames.get(jid);
    const messageContent = message.message?.trim();

    // Ignore if no game, game not active, question not active, or if it's a command
    if (!game || !game.isActive || !game.isQuestionActive || (messageContent && messageContent.startsWith('.'))) {
        return;
    }

    if (!messageContent) {
        return; // Ignore empty messages
    }

    const userId = message.sender;
    const username = message.pushName || message.data.pushName || userId?.split('@')?.[0] || 'Unknown Player';

    // console.log(`[Math Game] Processing user answer: "${messageContent}" from ${username}`); // Removed log
    // The handleAnswer method now directly sends messages including mentions
    await game.handleAnswer(messageContent, userId, username);
});

// Manual end command
Module({
    pattern: 'endmath',
    fromMe: isPrivateBot,
    desc: 'Ends the current math challenge prematurely.',
    use: 'game'
}, async (message) => {
    const jid = message.jid;
    const game = activeMathGames.get(jid);
    // console.log(`[Math Game] 'endmath' command received in ${jid}`); // Removed log

    if (!game || !game.isActive) {
        // console.log(`[Math Game] No active Math challenge to end in ${jid}.`); // Removed log
        return await message.sendReply('_No active Math challenge to end in this chat._');
    }

    await message.sendReply('_Math challenge manually ended! Displaying final results..._');
    await game.endGame('manual');
});
