import React, {Component} from 'react';
import logo from './logo.svg';
import './App.css';

import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from 'react-bootstrap/Navbar';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import FeatherIcon from 'feather-icons-react';
import {Line} from 'react-chartjs-2';
import moment from 'moment-timezone';


class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            config: {
                type: 'line',
                datasets: [{
                    label: 'Competitor',
                    fill: false,
                    lineTension: 0,
                    pointRadius: 1,
                    borderColor: getRandomColor(),
                    borderWidth: .5,
                    data: [],
                }]
            },
            loading: false,
            userID: '',
            userList: [],
            kettlebell: 24,
            handleSubmit: '',
            repetitions: 10,
            kettlebellPresses: [],
            userLookupTable: [],
            userTotals: []
        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleReps = this.handleReps.bind(this);
        this.handleKettlebell = this.handleKettlebell.bind(this);
        this.handleUserID = this.handleUserID.bind(this);
        this.loadData = this.loadData.bind(this);
        this.tallyTotals = this.tallyTotals.bind(this);
    }

    handleKettlebell(e) {
        this.setState({kettlebell: e.target.value})
    }

    handleReps(e) {
        this.setState({repetitions: e.target.value})
    }

    handleUserID(e) {
        this.setState({userID: e.target.value})
    }

    handleSubmit() {
        this.setState({loading: true});
        console.log(this.state);
        let data = {
            uuid: this.state.userID,
            weight: this.state.kettlebell,
            repetitions: this.state.repetitions,
            createdTime: new Date()
        };
        fetch("/api/addSet",
            {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(response => response.json())
            .then((data) => {
                if (data.success !== true) {
                    alert("Unable to add page." + data.errorMessage)
                }
            })
            .catch((error) => {
                alert(`${error} retrieving pages failed.`)
            }).finally(() => {
            this.loadData();
            this.setState({loading: false})
        });
    }

    loadData() {
        this.setState({pageIsLoading: true});
        fetch("/api/getKettlebellPresses").then(response => response.json())
            .then((data) => {
                console.log(data);
                this.setState({kettlebellPresses: data})
            })
            .catch((error) => {
                alert(`${error} retrieving presses failed.`)
            }).finally(() => {
            this.tallyTotals();
        })
    }

    getUsers() {
        this.setState({pageIsLoading: true, userList: [], kettlebellPresses: []});
        fetch("/api/getUserList").then(response => response.json())
            .then((data) => {
                console.log(data);
                let lookup = {};
                for (let i = 0, len = data.length; i < len; i++) {
                    lookup[data[i].id] = data[i];
                }
                this.setState({userList: data, userID: data[0].id, userLookupTable: lookup})
            })
            .catch((error) => {
                alert(`${error} retrieving users failed.`)
            }).then(() => {
            this.loadData()
        })
    }

    tallyTotals() {
        let users = this.state.userList || [];
        let tempConfig = this.state.config;
        users.map((_, index) => {
            const presses = this.state.kettlebellPresses || [];
            users[index].totalReps = users[index].totalKgs = 0;

            // initialize our dataset
            tempConfig.datasets[index] = {
                label: 'Data Summary',
                //			backgroundColor: color(window.chartColors.red).alpha(0.5).rgbString(),
                //		borderColor: window.chartColors.red,
                fill: false,
                lineTension: 0,
                pointRadius: 1,
                borderColor: getRandomColor(),
                borderWidth: .5,
                data: [],
            };

            for (let set in presses) {
                // this is the set you are looking for....
                if (presses[set].uuid == users[index].id) {
                    let prevTotalKg = users[index].totalKgs || 0;
                    let prevTotalReps = users[index].totalReps || 0;
                    users[index].totalKgs = parseInt((presses[set].repetitions * presses[set].weight) + prevTotalKg);
                    users[index].totalReps = parseInt(presses[set].repetitions + prevTotalReps);

                    tempConfig.datasets[index].label = users[index].name;
                    tempConfig.datasets[index].data.push({
                        x: moment(presses[set].createdTime),
                        y: parseInt((presses[set].repetitions * presses[set].weight) + prevTotalKg)
                    });
                }
            }
        });
        users.sort((a, b) => (a.totalKgs < b.totalKgs) ? 1 : -1);
        console.log("new users inc totals: ");
        console.log(users);
        console.log(tempConfig);
        this.setState({userList: users, config: tempConfig});
    }

    componentWillMount() {
        this.getUsers();
    }

    render() {
        const users = this.state.userList || [];
        const kbs = [16, 24, 32, 48];
        const repRange = [5, 10, 25, 50, 100];
        const userNameList = users.map((_, index) => {
            return (
                <option key={index} value={users[index].id}>{users[index].name}</option>
            )
        });
        const repsList = repRange.map((_, index) => {
            return (
                <option key={index} value={repRange[index]}>{repRange[index]} reps</option>
            )
        });
        const kettlebellList = kbs.map((_, index) => {
            return (
                <option key={index} value={kbs[index]}>{kbs[index]} kg</option>
            )
        });
        const kettlebellsTable = users.map((_, index) => {
            return (
                <tr>
                    <td>{index + 1}</td>
                    <td>{users[index].name}</td>
                    <td>{users[index].totalReps}</td>
                    <td>{users[index].totalKgs}</td>
                </tr>
            )
        });


        return (
            <Container-fluid>
                <Navbar bg="dark" variant="dark">
                    <Navbar.Brand href="#home">
                        <img
                            alt=""
                            src="/static/favicon.ico"
                            width="30"
                            height="30"
                            className="d-inline-block align-top"
                        />
                        {' KettleBell Competition'}
                    </Navbar.Brand>
                </Navbar>
                <Card>
                    <Card.Title><h3>Ranking</h3></Card.Title>
                    <Card.Body>
                        <Row>

                            <Col>
                                <Line
                                    ref="chart"
                                    data={this.state.config}
                                    height={400}
                                    options={{
                                        maintainAspectRatio: false,
                                        responsive: true,
                                        title: {
                                            display: true,
                                            text: `Kettlebell Press Competition`
                                        },
                                        scales: {
                                            xAxes: [{
                                                type: 'time',
                                                display: true,
                                                scaleLabel: {
                                                    display: true,
                                                    labelString: "Days",
                                                },
                                                ticks: {
                                                    major: {
                                                        fontStyle: 'bold',
                                                        fontColor: '#FF0000'
                                                    }
                                                }
                                            }],
                                            yAxes: [{
                                                display: true,
                                                scaleLabel: {
                                                    display: true,
                                                    labelString: 'KGs'
                                                }
                                            }]
                                        }
                                    }}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Table striped bordered hover>
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Total Reps</th>
                                        <th>Total KG</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {kettlebellsTable}
                                    </tbody>
                                </Table>
                            </Col>
                        </Row>
                        <Row >
                            <Col md={4}>
                                <Form>
                                    <Form.Group controlId="kbForm.username">
                                        <Form.Label>Username</Form.Label>
                                        <Form.Control
                                            value={this.state.userID}
                                            onChange={this.handleUserID} as="select">
                                            {userNameList}
                                        </Form.Control>
                                    </Form.Group>
                                    <Form.Group controlId="kbForm.reps">
                                        <Form.Label>Number Of Reps</Form.Label>
                                        <Form.Control
                                            value={this.state.repetitions}
                                            onChange={this.handleReps} as="select">
                                            {repsList}
                                        </Form.Control>
                                    </Form.Group>
                                    <Form.Group controlId="kbForm.kettlebell">
                                        <Form.Label>Kettlebell Size</Form.Label>
                                        <Form.Control
                                            value={this.state.kettlebell}
                                            onChange={this.handleKettlebell} as="select">
                                            {kettlebellList}
                                        </Form.Control>
                                    </Form.Group>
                                </Form>
                                <Button variant={'primary'}
                                        disabled={(this.state.loading) || !this.state.userID}
                                        onClick={!(this.state.loading) ? this.handleSubmit : null}>
                                    {(this.state.loading) ? <Spinner
                                        as="span"
                                        animation="grow"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                    /> : ''}
                                    {'Add Set'}
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </Container-fluid>
        );
    }
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

export default App;
