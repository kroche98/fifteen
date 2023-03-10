/*eslint-env es6*/

const TILE_WIDTH = 50; // width in px of a tile

/** Shuffle an array */
function shuffle(arr) {
	const shuffledArr = [];
	while(arr.length) {
		randomIndex = Math.floor(Math.random() * arr.length);
		shuffledArr.push(arr[randomIndex]);
		arr.splice(randomIndex, 1);
	}
	return shuffledArr;
}


/**
 * Represents the state of a 15 puzzle
 * 
 * The board configuration is stored as a zero-indexed 1-dimensional array of numbers from
 * 0 to n^2-1, with the largest number (n^2-1) representing the blank square.
 */
class Puzzle {
    constructor(size) {
        this.size = size;
        this.board = [...Array(size*size).keys()];
        this.blank_val = size*size - 1;
    }

    /** Convert from array index to logical x-coordinate */
	_x(i) {
        return i % this.size;
    }

	/** Convert from array index to logical x-coordinate */
	_y(i) {
        return Math.floor(i / this.size);
    }

	/** Convert from logical x- and y-coordinates to array index */
	_i(x, y) {
        return this.size * y + x;
    }

    /** Get index of blank square */
    _blank_i() {
        return this.board.indexOf(this.blank_val);
    }

    /** Randomly shuffle the board, ensuring that the resulting configuration is solvable */
	randomize() {
		do {
			this.board = shuffle(this.board);
		} while (!this.solvable());
	}
	
    /**
     * Determine whether the current position is solvable
     * For the formula to determine solvability, see https://www.cs.bham.ac.uk/~mdr/teaching/modules04/java2/TilesSolvability.html
     * One of the following conditions must be true:
     * 1. grid width is odd, and number of inversions is even
     * 2. grid width is even, and different parity of blank tile row number counting from bottom and number of inversions
     */
    solvable() {
		return (
            (this.size%2===1) && (this.inversions()%2===0) )
            || ( (this.size%2===0) && ( (this._y(this._blank_i())%2===1) === (this.inversions()%2===0) )
        )
	}
	
    /**
     * Compute number of inversions of the current board configuration
     * For a description of what the number of inversions means, see https://www.cs.bham.ac.uk/~mdr/teaching/modules04/java2/TilesSolvability.html
     */
	inversions() {
		return this.board.map( (val1, idx1, arr) => (val1===this.size*this.size-1) ? 0 : arr.filter( (val2, idx2) => (idx2 > idx1 && val2 < val1) ).length)
            .reduce( (accum, elem) => accum + elem, 0);
	}
	
    /**
     * Attempt to slide the tile with the given id
     * @param {Number} i 
     * @returns {Boolean} whether the move succeeded
     */
	slide(i) {
		let x = this._x(i);
		let y = this._y(i);
        let blank_i = this._blank_i();
        let blank_x = this._x(blank_i)
        let blank_y = this._y(blank_i)
        if ( (x === blank_x) && (y === blank_y) ) {
            return false; // can't slide the blank space
        } else if (x === blank_x) { // vertical move
            let j = blank_i; // starting index of blank space
            if (blank_i > i) { // blank space needs to move up on the board, i.e. its index needs to decrease
                while (j > i) {
                    this._swap(j, j-this.size);
                    j -= this.size;
                }
            } else if (blank_i < i) { // blank space needs to move down on the board, i.e. its index needs to increase
                while (j < i) {
                    this._swap(j, j+this.size);
                    j += this.size;
                }
            }
        } else if (y === blank_y) { // horizontal move
            let j = blank_i; // starting index of blank space
            if (blank_i > i) { // blank space needs to move left on the board, i.e. its index needs to decrease
                while (j > i) {
                    this._swap(j, j-1);
                    j -= 1;
                }
            } else if (blank_i < i) { // blank space needs to move right on the board, i.e. its index needs to increase
                while (j < i) {
                    this._swap(j, j+1);
                    j += 1;
                }
            }
        } else {
            return false; // illegal move
        }

        return true
	}
	
    /** Determine whether the current board configuration is in the solved state */
	solved() {
        const solvedState = [...Array(this.size*this.size).keys()];
		return this.board.every( (tileVal, idx) => tileVal === solvedState[idx] );
	}

    /** Swap the tiles at the given indexes */
    _swap(i1, i2) {
        [this.board[i1], this.board[i2]] = [this.board[i2], this.board[i1]];
    }
}


class PuzzleDisplay {
    /**
     * View of a Puzzle in an HTML div element
     * 
     * The class has a this.squares member, which holds all the piece divs.
     * 
     * @param {Puzzle} puzzle 
     * @param {HTMLDivElement} containerDiv
     * @param {Number} tileWidth the width in px of a tile
     * @param {Function} styleSpecifier a function specifying how tiles are to be decorated,
     * which will be called once for each tile and should take four arguments:
     * - tileId: the id of the piece, which is a number from 0 to n^2-1
     * - tileDiv: the div to which the style should be applied
     * - tileWidth: the width in px of a tile
     * - puzzle: the puzzle being decorated
     */
	constructor(puzzle, containerDiv, tileWidth, styleSpecifier) {
		this.puzzle = puzzle;
        this.tileWidth = tileWidth;
		this.styleSpecifier = styleSpecifier;
		
        // remove anything already in the container div
        while (containerDiv.firstChild)
            containerDiv.removeChild(containerDiv.firstChild);
		
        // create a frame div within the container div
		const frameDiv = document.createElement('div');
		frameDiv.id = "puzzle-frame";
        frameDiv.style.width = this.tileWidth * puzzle.size + "px";
        frameDiv.style.height = this.tileWidth * puzzle.size + "px";
		containerDiv.appendChild(frameDiv);
		
        // build the puzzle up within the frame div
		this.squares = [];
		for (let squareId of puzzle.board) {
            let squareContainerDiv = document.createElement('div');
            squareContainerDiv.style.order = squareId;
            squareContainerDiv.style.height = 100/this.puzzle.size + "%";
            squareContainerDiv.style.width = 100/this.puzzle.size + "%";
            squareContainerDiv.onclick = () => this.move(squareContainerDiv);
			let squareDiv = document.createElement('div');
			this.squares[squareId] = squareContainerDiv;
            squareContainerDiv.append(squareDiv);
			frameDiv.appendChild(squareContainerDiv);
		}
        
        // finally, apply styles to the individual pieces
		this.decorate();
	}
	
    /** Apply styles to the tiles */
	decorate() {
		for (let i = 0; i < this.squares.length; i++) {
			let pieceVal = this.puzzle.board[i];
            let tileDiv = this.squares[i].firstChild;
            
            // first clear any existing formatting
            tileDiv.className = '';
            tileDiv.style.cssText = '';
            tileDiv.textContent = '';
            
			if (i === this.puzzle.blank_val) // the blank square gets its own style
                tileDiv.className = "square blank";
			else // the other squares have a style determined by the styleSpecifier function                
				this.styleSpecifier(i, tileDiv, this.tileWidth, this.puzzle);
            
            // size the pieces to fill the container
            tileDiv.style.height = "100%";
            tileDiv.style.width = "100%";
		}
	}
    
    /** Change the puzzle style */
    changeStyle(styleSpecifier) {
        this.styleSpecifier = styleSpecifier;
        this.decorate();
    }
    
    /** Attempt to move the piece with the given id */
    move(div) {
        if (this.puzzle.slide(div.style.order)) { // try to slide it within the Puzzle object
            this.updateDisplay()
            if (this.puzzle.solved()) {
                // delay the popup so that the move is processed before the popup appears
                setTimeout(() => alert("Congratulations! You solved the puzzle."), 10);
            }
        }
    }
    
    /** Update the display after tiles are moved */
    updateDisplay() {
        for (let i of this.puzzle.board.keys()) {
            let val = this.puzzle.board[i];
            this.squares[val].style.order = i;
        }
    }
    
    /** Scramble the puzzle */
	randomize() {
		this.puzzle.randomize(); // shuffle the puzzle itself
		this.updateDisplay(); // update the display
	}
}


/*
A style function defines the style/appearance of the puzzle.
The style function will be called once for each tile of the puzzle and should take
four arguments (see the documentation under the PuzzleDisplay class).
The point of abstracting this out is that the appearance from the puzzle is separate
from the display, and it is simple to create new puzzle styles
    
The function may modify the style in the following ways:
- changing tileDiv.className
- changing tileDiv.textContent
- changing any of the tileDiv.style attributes

Any modifications apart from these may have unintended consequences
*/

// red and white checkerboard style
function redWhiteStyle(tileId, tileDiv, tileWidth, puzzle) {
	if (puzzle.size%2===0) {
		tileDiv.className = ((tileId + puzzle._y(tileId))%2 === 0) ? "square tile red" : "square tile white";
	}
	else
		tileDiv.className = (tileId%2 === 0) ? "square tile red" : "square tile white";
	tileDiv.textContent = tileId+1;
}

// gray style
function grayStyle(tileId, tileDiv, tileWidth, puzzle) {
    tileDiv.className = "square tile gray";
    tileDiv.textContent = tileId+1;
}

// abstract background style
function image1Style(tileId, tileDiv, tileWidth, puzzle) {
	tileDiv.className = "square tile image1";
    tileDiv.style.backgroundSize = tileWidth*puzzle.size + "px " + tileWidth*puzzle.size + "px";
    tileDiv.style.backgroundPositionX = puzzle._x(tileId)*-tileWidth + "px";
	tileDiv.style.backgroundPositionY = puzzle._y(tileId)*-tileWidth + "px";
}

// picture of Dr. Coleman style
function image2Style(tileId, tileDiv, tileWidth, puzzle) {
	tileDiv.className = "square tile image2";
    tileDiv.style.backgroundSize = tileWidth*puzzle.size + "px " + tileWidth*puzzle.size + "px";
    tileDiv.style.backgroundPositionX = puzzle._x(tileId)*-tileWidth + "px";
	tileDiv.style.backgroundPositionY = puzzle._y(tileId)*-tileWidth + "px";
	tileDiv.textContent = tileId+1;
}


/** Replace the current puzzle with a new nxn puzzle */
function changeSize(n) {
    const curStyle = puzzleDisplay.styleSpecifier;
    puzzle = new Puzzle(n);
    puzzleDisplay = new PuzzleDisplay(puzzle, document.getElementById("puzzlecontainer"), TILE_WIDTH, curStyle);
}

let puzzle = new Puzzle(4);
let puzzleDisplay = new PuzzleDisplay(puzzle, document.getElementById("puzzlecontainer"), TILE_WIDTH, redWhiteStyle);
