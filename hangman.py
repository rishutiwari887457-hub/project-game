# ==============================================================================
# Project: Hangman Game (Console-based)
# Description: A beginner-friendly Python implementation of the classic Hangman
#              word guessing game.
# Concepts: random module, lists, strings, while loop, if-else, user input,
#           and basic string/list operations.
# ==============================================================================

import random

def play_hangman():
    # 1. Predefined list of 5 words
    words = ["python", "computer", "college", "coding", "program"]

    # 2. Randomly select one word from the list
    secret_word = random.choice(words)

    # 3. Game state variables
    guessed_letters = []      # List to store all valid letters guessed by the player
    incorrect_guesses = 0     # Counter for incorrect attempts
    max_incorrect = 6         # Maximum allowed incorrect attempts

    # 4. Display Welcome Message
    print("========================================")
    print("       Welcome to Hangman Game!         ")
    print("========================================")
    print("Guess the secret word one letter at a time.")
    print(f"You have {max_incorrect} incorrect attempts allowed.\n")

    # 5. Main game loop using a while loop
    while incorrect_guesses < max_incorrect:
        # Build the display representation of the secret word
        # Revealed letter if guessed, underscore '_' if not yet guessed
        displayed_word = []
        for letter in secret_word:
            if letter in guessed_letters:
                displayed_word.append(letter)
            else:
                displayed_word.append("_")

        # Show current progress with spaces between letters/underscores
        print("Word: " + " ".join(displayed_word))

        # Check Winning Condition:
        # If there are no underscores left, all letters have been found!
        if "_" not in displayed_word:
            print("\n****************************************")
            print("         Congratulations! You Win!      ")
            print(f"  You guessed the word: {secret_word.upper()}")
            print("****************************************")
            break

        # 6. Ask player for user input
        user_input = input("\nEnter a letter: ")

        # Convert input to lowercase to avoid case-sensitivity issues
        guess = user_input.strip().lower()

        # Input Validation:
        # Check if the user entered more or less than 1 character
        if len(guess) != 1:
            print(">> Please enter exactly one character at a time.\n")
            continue

        # Check if the input is a valid alphabet letter
        if not guess.isalpha():
            print(">> Please enter a valid letter from the alphabet (a-z).\n")
            continue

        # Check if the letter has already been guessed
        if guess in guessed_letters:
            print(f">> You have already guessed the letter '{guess}'. Try a different one!\n")
            continue

        # Record the new guessed letter
        guessed_letters.append(guess)

        # 7. Check if the guess is in the secret word
        if guess in secret_word:
            print(f">> Good job! '{guess}' is in the word.\n")
        else:
            incorrect_guesses += 1
            remaining_attempts = max_incorrect - incorrect_guesses
            print(f">> Oops! '{guess}' is not in the word.")
            print(f">> Remaining attempts: {remaining_attempts}\n")

    # 8. Check Losing Condition:
    # If the player reached 6 incorrect guesses
    if incorrect_guesses == max_incorrect:
        print("========================================")
        print("              Game Over!                ")
        print("========================================")
        print(f"You ran out of attempts! The correct word was: {secret_word.upper()}")
        print("Better luck next time!\n")

# Entry point of the script
if __name__ == "__main__":
    play_hangman()
