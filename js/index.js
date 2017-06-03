import Life from './life.js' 
import echarts from 'echarts'
import '../css/style.css'

var arr = [[0,0,0],[1,1,1],[0,0,0]]

var arr1 = 	[
				[0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
	            [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
	            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
	            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
	            [0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
	            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
	            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            ]
var contain = document.getElementById("myCanvas")
var button = document.getElementById('button')
//新建实例
var test = new Life({arr:arr1,contain:contain})


function start()
{        
	setInterval(function(){

		test.nextGeneration()

	},1000)  
}

//绑定click事件
button.addEventListener('click',start)




