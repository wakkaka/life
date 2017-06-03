import Hello from './hello.js' 
import echarts from 'echarts'
import '../css/style.css'

// var myChart = echarts.init(document.getElementById('main'))

// myChart.setOption({
// 	title: { text: 'ECharts 入门示例' },
// 	tooltip: {},
// 	xAxis: {
// 		data: ["衬衫","羊毛衫","雪纺衫","裤子","高跟鞋","袜子"]
// 	},
// 	yAxis: {},
// 	series: [{
// 		name: '销量',
// 		type: 'bar',
// 		data: [5,20,36,10,10,20]
// 	}]
// })


var myChart = echarts.init(document.getElementById('main'));

// 指定图表的配置项和数据
var data0 = [[0,0],[1,1],[2,2],[3,3]]
var data1 = [[0,1],[1,2],[2,1],[3,0]]

var option = {
    title: {
        text: 'ECharts 入门示例'
    },
    tooltip: {},
    xAxis: [
    		{
                type : 'value',
                scale:true
            }
            ],
    yAxis : [
        {
            type : 'value',
            scale:true,
            inverse: true  
        }
    ],
    series: [{
        name: '生死',
        type: 'scatter',
        data: data0
    }]
};
// console.log(option.series[0].data)
// 使用刚指定的配置项和数据显示图表。
setInterval(function(){
	if(option.series[0].data == data1)
	{
		option.series[0].data = data0
	} else if (option.series[0].data == data0)
	{
		option.series[0].data = data1
	}
	console.log(option.series[0].data)
	myChart.setOption(option);
}, 3000)
myChart.setOption(option);



// function test()
// {
// 	var a = "张三",
// 		b = "李四",
// 		c = "",
// 		resA,
// 		resB,
// 		resC,
// 		boolA,
// 		boolB,
// 		boolC

// 	resA = Hello(a)
// 	resB = Hello(b)
// 	resC = Hello(c)

// 	boolA = (resA === "Hello, " + a)
// 	boolB = (resB === "Hello, " + b)
// 	boolC = (resC === "Hello, " + c)

// 	if( boolA && boolB && boolC )
// 	{
// 		return true
// 	} else {
// 		console.log( a + ":" + boolA )
// 		console.log( b + ":" + boolB )
// 		console.log( c + ":" + boolC )
// 	} 
// }

// test()

