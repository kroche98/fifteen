/*eslint-env es6*/

const TILE_WIDTH = 50; // width in px of a tile

/*------------------------- Utility Functions -------------------------*/

// shuffle an array
function shuffle(arr) {
	let shuffledArr = [];
	while(arr.length) {
		randomIndex = Math.floor(Math.random() * arr.length);
		shuffledArr.push(arr[randomIndex]);
		arr.splice(randomIndex, 1);
	}
	return shuffledArr;
}

// replace the current puzzle with a new nxn puzzle
function changeSize(n) {
    let curStyle = puzzleDisplay.styleSpecifier;
    puzzle = new Puzzle(n);
    puzzleDisplay = new PuzzleDisplay(puzzle, document.getElementById("puzzlecontainer"), TILE_WIDTH, curStyle);
}

/*---------------------------------------------------------------------*/


/*--------------------------- Puzzle Model ----------------------------*/

class Puzzle {
    /* The board configuration is stored as a 1-dimensional array of numbers from 0 to n^2-1,
        with the largest number (n^2-1) representing the blank square. At any point, the board is
        represented as a permutation of the numbers from 0 to n^2-1.
        For convenience, the value representing the blank square is stored in this._blank_val.
        
        The functions this._x and this._y convert from the index within the 1-D array to logical
        x- and y-coordinates. The function this._i does the reverse.
        
        Also, for convenience, the current x- and y-coordinates are stored in this._blank_x
        and this._blank_y. Any function that modifies the board configuration is responsible
        for updating these values.
    */
    
    // create a new (size x size) puzzle
	constructor(size) {
		this.size = size;
		this.board = new Array(size*size).fill(undefined).map((_, i) => i);
		this.solvedBoard = this.board.slice();
		this._blank_val = size*size-1;
		this._blank_x = size-1;
		this._blank_y = size-1;
	}
	
	// convert from array index to logical x-coordinate
	_x(square) {return square%this.size;}
	// convert from array index to logical x-coordinate
	_y(square) {return Math.floor(square/this.size);}
	// convert from logical x- and y-coordinates to array index
	_i(x, y) {return this.size*y + x;}
    
    // randomly shuffle the board, ensuring that the resulting configuration is solvable
	randomize() {
		do {
			this.board = shuffle(this.board);
            // remember to update the position of the blank square
			let blank_pos = this.board.indexOf(this._blank_val);
			this._blank_x = this._x(blank_pos);
			this._blank_y = this._y(blank_pos);
		} while (!this.solvable());
	}
	
    // boolean to determine whether the current position is solvable
	solvable() {
        // https://www.cs.bham.ac.uk/~mdr/teaching/modules04/java2/TilesSolvability.html has the formula to determine solvability:
        // ( (grid width odd) && (#inversions even) )  ||  ( (grid width even) && ((blank on odd row from bottom) == (#inversions even)) )
		return ( (this.size%2===1) && (this.inversions()%2===0) ) || ( (this.size%2===0) && ( (this._blank_y%2===1) === (this.inversions()%2===0) ) )
	}
	
    // compute number of inversions of the current board configuration
	inversions() {
        // for use by solvable()
        // see https://www.cs.bham.ac.uk/~mdr/teaching/modules04/java2/TilesSolvability.html for a description of what the number of inversions means
		return this.board.map( (val1, idx1, arr) => (val1===this.size*this.size-1) ? 0 : arr.filter( (val2, idx2) => (idx2 > idx1 && val2 < val1) ).length).reduce( (accum, elem) => accum + elem, 0);
	}
	
    // attempt to slide the tile with the given id, and return a boolean to indicate whether the move succeeded
	slide(id) {
        // we use the distance formula to determine whether the move is legal
        // the move is legal if and only if the distance between the tile and the blank is 1
		let square_x = this._x(id);
		let square_y = this._y(id);
		let legal = (Math.sqrt( (square_x - this._blank_x)**2 + (square_y - this._blank_y)**2 ) == 1);
		if (legal) {
            // swap the tile with the blank square
			this.board[this._i(this._blank_x, this._blank_y)] = this.board[id];
			this.board[id] = this._blank_val;
            // remember to update the position of the blank square
			this._blank_x = square_x;
			this._blank_y = square_y;
		}
		return legal;
	}
	
    // determine whether the current board configuration is in the solved state
	solved() {
        // just compare elementwise with this.solvedBoard
		return this.board.every( (tileVal, idx) => tileVal=== this.solvedBoard[idx] );
	}
}

/*---------------------------------------------------------------------*/


/*----------------------- Puzzle Display Model ------------------------*/

class PuzzleDisplay {
    /* The constructor takes:
        - an object of the Puzzle class
        - a div in the DOM to act as a container for the puzzle, which will be emptied if it contains any elements
        - an integer specifying the width in pixels of a tile
        - a function specifying how the tiles are to be decorated
        
        The function styleSpecifier will be called once for each tile and should take four arguments:
        - tileId: the id of the piece, which is a number from 0 to n^2-1
        - tileDiv: the div to which the style should be applied
        - tileWidth: the width in px of a tile
        - puzzle: the puzzle being decorated
        
        The class has a this.squares member, which holds all the piece divs. Any function that changes
        the puzzle state is responsible for ensuring that the order in this.squares corresponds to
        the order in this.puzzle.board.
    */
    
    // create a new display for puzzle within containerDiv
	constructor(puzzle, containerDiv, tileWidth, styleSpecifier) {
		this.puzzle = puzzle; // the puzzle associated with the display
        this.tileWidth = tileWidth; // width in px of a tile
		this.styleSpecifier = styleSpecifier; // function specifying how to decorate tiles
		
        // remove anything already in the container div
        while (containerDiv.firstChild)
            containerDiv.removeChild(containerDiv.firstChild);
		
        // create a frame div within the container div
		var frameDiv = document.createElement('div');
		frameDiv.id = "puzzleFrame";
		frameDiv.className = "puzzleframe";
        frameDiv.style.width = this.tileWidth * puzzle.size + "px";
        frameDiv.style.height = this.tileWidth * puzzle.size + "px";
		containerDiv.appendChild(frameDiv);
		
        // and build the puzzle up within the frame div
		this.squares = [];
		for (let squareId of puzzle.board) {
			var squareDiv = document.createElement('div');
			squareDiv.id = `square${squareId}`;
			squareDiv.setAttribute('data-id', squareId);
			let puz = this;
			squareDiv.onclick = function() { puz.move(this.dataset.id); };
			this.squares[squareId] = squareDiv;
			frameDiv.appendChild(squareDiv);
		}
        
        // and finally apply styles to the individual pieces
		this.decorate();
	}
	
    // apply styles to the tiles
	decorate() {
		for (let i = 0; i < this.squares.length; i++) {
			let pieceVal = this.puzzle.board[i];
            let tileDiv = this.squares[i];
            
            // first clear any existing formatting
            tileDiv.className = '';
            tileDiv.style.cssText = '';
            tileDiv.textContent = '';
            
			if (pieceVal===puzzle._blank_val) // the blank square gets its own style
                tileDiv.className = "square blank";
			else // the other squares have a style determined by the styleSpecifier function                
				this.styleSpecifier(pieceVal, tileDiv, this.tileWidth, this.puzzle);
            
            // size the pieces appropriately
            // we do this every time we decorate since clearing existing formatting will also clear this
            tileDiv.style.height = 100/this.puzzle.size + "%";
            tileDiv.style.width = 100/this.puzzle.size + "%";
		}
	}
    
    // change the puzzle style
    changeStyle(styleSpecifier) {
        this.styleSpecifier = styleSpecifier;
        this.decorate();
    }
    
    // attempt to move the piece with the given id
    move(clickedSquareId) {
        // get the original position of the blank square
        // we do this *before* the if statement since this.puzzle.slide() will change its position
        let blankSquareId = this.puzzle._i(puzzle._blank_x, puzzle._blank_y);

        if (this.puzzle.slide(clickedSquareId)) { // try to move it within the Puzzle object
            // if that succeeds, swap the clicked square with the blank square
            this.swapSquares(blankSquareId, clickedSquareId);
            
            // check to see if this move wins the game
            if (this.puzzle.solved())
                alert("Congratulations! You solved the puzzle.");
        }
    }
    
    // swap the squares with the given ids
    swapSquares(square1Id, square2Id) {
        // retrieve the nodes themselves
        let square1 = document.getElementById(`square${square1Id}`);
        let square2 = document.getElementById(`square${square2Id}`);
                
        // swap them in this.squares
        this.squares[square1Id] = square2;
        this.squares[square2Id] = square1;
        
        // swap them in the DOM
        let parent = square1.parentNode;
        let placeholder1 = parent.insertBefore(document.createElement('div'), square1);
        let placeholder2 = parent.insertBefore(document.createElement('div'), square2);
        parent.replaceChild(square2, placeholder1);
        parent.replaceChild(square1, placeholder2);
        
        // swap id and data-id back
        let tempId = square1.dataset.id;
        square1.id = `square${square2.dataset.id}`;
        square1.dataset.id = square2.dataset.id;
        square2.id = `square${tempId}`;
        square2.dataset.id = tempId;
    }
    
    // scramble the puzzle
	randomize() {
		this.puzzle.randomize(); // shuffle the puzzle itself
		this.decorate(); // update the display
	}
}

/*---------------------------------------------------------------------*/


/*--------------------------- Puzzle Styles ---------------------------*/

/* A style function defines the style/appearance of the puzzle.
    The style function will be called once for each tile of the puzzle and should take
    four arguments (see the documentation under the Puzzle Display class).
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

/*---------------------------------------------------------------------*/

// default setup
let puzzle = new Puzzle(4);
let puzzleDisplay = new PuzzleDisplay(puzzle, document.getElementById("puzzlecontainer"), TILE_WIDTH, redWhiteStyle);
