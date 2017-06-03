import $ from 'jquery'

function Life()
{
	this.initialize.apply(this, arguments)
}

Life.prototype = {

	//初始化
	initialize: function(options)
	{
		this.board = options.arr //初始值
		this.contain = options.contain
		this.xOffset = 20
	    this.yOffset = 20
	    this.gridSize = 40
	    this.size = 10
	    this.context = this.contain.getContext("2d")

	    this.paint()

	},

	//绘图
	paint: function()
	{
		this.context.fillStyle = "#eeeeee" //背景颜色
        this.context.fillRect(0, 0, 500, 500)
        this.context.fillStyle = "#00ff00" //方块填充绿色

        //画横线
        for (var i = 0; i <= this.size; i++) 
        {
            this.context.moveTo(this.xOffset, this.yOffset + i * this.gridSize)
            this.context.lineTo(this.xOffset + this.gridSize * this.size, this.yOffset + i * this.gridSize)
        }
        //画竖线
        for (var i = 0; i <= this.size; i++) 
        {
            this.context.moveTo(this.xOffset + i * this.gridSize, this.yOffset)
            this.context.lineTo(this.xOffset + i * this.gridSize, this.yOffset + this.gridSize * this.size)
        }

        this.context.stroke()

        //填充方格
        for (var x = 0; x < this.board.length; x++) 
        {
            for (var y = 0; y < this.board[x].length; y++) 
            {
                if (this.board[x][y] == 1) 
                {
                    this.context.fillRect(this.yOffset + y * this.gridSize, this.xOffset + x * this.gridSize,this.gridSize - 1, this.gridSize - 1)
 
                }
            }
        }
	},

	//得到下一状态
    nextGeneration: function() 
    {	
    	//状态
    	this.board = this.computeNewState()
        
        //绘图
        this.paint()
    },

    computeNewState: function()
    {	
    	var bodrdCopy = $.extend(true, [], this.board)
        
        for (var i = 0; i < this.board.length; i++) 
        {
            for (var j = 0; j < this.board[i].length; j++) 
            {
                var count = this.computeLiveCellNum(i, j)
                if (count == 3) 
                {
                    bodrdCopy[i][j] = 1;
                } else if (count == 2) 
                {
 
                } else 
                {
                    bodrdCopy[i][j] = 0;
                }
            }
        }

        return bodrdCopy
    },

    computeLiveCellNum: function(x, y) 
    {
        var count = 0
        for (var i = x - 1; i <= x + 1; i++) 
        {
            for (var j = y - 1; j <= y + 1; j++) 
            {
                if (i < 0 || i >= this.board.length || j < 0 || j >= this.board.length) 
                {
                    continue
                }

                if (this.board[i][j]) 
                {
                    count++
                }
            }
        }
        
        if (this.board[x][y]) 
        {
            count--
        }
        return count
    }

}

export default Life