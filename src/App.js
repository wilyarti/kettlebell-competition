import React, {Component} from 'react';
import {instanceOf} from 'prop-types';
import logo from './logo.svg';
import './App.css';

import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Table from 'react-bootstrap/Table';
import Alert from 'react-bootstrap/Alert';
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Toast from 'react-bootstrap/Toast';
import {Line} from 'react-chartjs-2';
import moment from 'moment';
import momentTZ from 'moment-timezone';
import JSONDATA from './kettlebellPresses';
import USERDATA from './userData'
import MYID from './myID'

import {withCookies, Cookies} from 'react-cookie';

const uuidv1 = require('uuid/v1');

class App extends Component {
    static propTypes = {
        cookies: instanceOf(Cookies).isRequired
    };

    constructor(props) {
        super(props);
        const {cookies} = props;
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
            mockup: false,
            loading: false,
            reloading: false,
            userID: cookies.get('userID') || 0,
            userList: [],
            kettlebell: cookies.get('kettlebell') || 24,
            handleSubmit: '',
            repetitions: cookies.get('repetitions') || 10,
            kettlebellPresses: [],
            userLookupTable: [],
            userTotals: [],
            latest: '',
            duration: cookies.get('duration') || 24,
            theLead: 0,
            theLeader: "NO LEADER",
            myID: '',
            msgs: []
        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleReload = this.handleReload.bind(this);
        this.handleReps = this.handleReps.bind(this);
        this.handleKettlebell = this.handleKettlebell.bind(this);
        this.handleUserID = this.handleUserID.bind(this);
        this.handleDuration = this.handleDuration.bind(this);
        this.loadData = this.loadData.bind(this);
        this.tallyTotals = this.tallyTotals.bind(this);
        this.getMyID = this.getMyID.bind(this);
        this.closeToast = this.closeToast.bind(this);
        this.handleResponse = this.handleResponse.bind(this);
    }

    closeToast(index) {
        let msgs = this.state.msgs;
        delete (msgs[index]);
        console.log(msgs);
        console.log(index);
        this.setState({msgs});
    }

    handleResponse(data, successTitle, failureTitle) {
        let msgs = this.state.msgs;
        let msg = {
            name: '',
            time: new moment(),
            body: data.errorMessage
        };
        if (data.success === true) {
            msg.name = successTitle;
        } else {
            msg.name = failureTitle;
        }
        msgs.push(msg);
        this.setState({msgs});
    }

    handleKettlebell(e) {
        const cookie = e.target.value;
        const {cookies} = this.props;
        cookies.set('kettlebell', cookie);
        this.setState({kettlebell: e.target.value})
    }

    handleReps(e) {
        const cookie = e.target.value;
        const {cookies} = this.props;
        cookies.set('repetitions', cookie);
        this.setState({repetitions: e.target.value})
    }

    handleUserID(e) {
        const cookie = e.target.value;
        const {cookies} = this.props;
        cookies.set('userID', cookie);
        this.setState({userID: e.target.value})
    }

    handleReload() {
        this.setState({reloading: true});
        this.loadData()
    }

    handleDuration(e) {
        const cookie = e.target.value;
        const {cookies} = this.props;
        cookies.set('duration', cookie);
        this.setState({duration: e.target.value}, () => {
            this.tallyTotals()
        });
    }

    handleSubmit() {
        this.setState({loading: true});
        console.log(this.state);
        let data = {
            uuid: this.state.myID,
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
                this.handleResponse(data, 'Successfully added set.', 'Unable to add set.');

            })
            .catch((error) => {
                let msgs = this.state.msgs;
                let msg = {
                        name: `Error adding set.`,
                        time: new moment(),
                        body: `Error: ${error}`
                    }
                ;
                msgs.push(msg);
                this.setState({msgs, pageIsLoading: false});
            }).finally(() => {
            this.loadData();
            this.setState({loading: false})
        });
    }

    //TODO add 30 second updater
    //TODO add latest update memo
    //TODO add 7 day rolling average
    loadData() {
        this.setState({loading: true});
        if (this.state.mockup) {
            const data = JSONDATA;
            console.log(data);
            this.setState({kettlebellPresses: data, loading: false, reloading: false}, () => {
                this.tallyTotals()
            });
            console.log(this.state);
            return;
        }
        fetch("/api/getKettlebellPresses").then(response => response.json())
            .then((data) => {
                console.log(data);
                this.setState({kettlebellPresses: data})
            })
            .catch((error) => {
                let msgs = this.state.msgs;
                let msg = {
                        name: `Error loading sets.`,
                        time: new moment(),
                        body: `Error: ${error}`
                    }
                ;
                msgs.push(msg);
                this.setState({msgs, pageIsLoading: false});
            }).finally(() => {
            this.tallyTotals();
            this.setState({loading: false, reloading: false});
        })
    }

    getMyID() {
        this.setState({loading: true});
        if (this.state.mockup) {
            this.setState({myID: MYID.id})
        }
        fetch("/api/getMyID").then(response => response.json())
            .then((data) => {
                console.log(data);
                if (data.active === true) {
                    this.setState({myID: data.id})
                }
            })
            .catch((error) => {
                alert(`${error} retrieving presses failed.`)
            }).finally(() => {
            this.getUsers();
            this.setState({loading: false, reloading: false});
        })
    }

    getUsers() {
        this.setState({loading: true, userList: [], kettlebellPresses: []});
        if (this.state.mockup) {
            let data = USERDATA;
            console.log(data);
            let lookup = {};
            for (let i = 0, len = data.length; i < len; i++) {
                lookup[data[i].id] = data[i];
            }
            console.log(data[0].id);
            this.setState({userList: data, userLookupTable: lookup}, () => {
                this.loadData();
                console.log(this.state)
            });
            return;
        }
        fetch("/api/getUserList").then(response => response.json())
            .then((data) => {
                console.log(data);
                let lookup = {};
                for (let i = 0, len = data.length; i < len; i++) {
                    lookup[data[i].id] = data[i];
                }
                this.setState({userList: data, userLookupTable: lookup})
            })
            .catch((error) => {
                let msgs = this.state.msgs;
                let msg = {
                        name: `Error loading users.`,
                        time: new moment(),
                        body: `Error: ${error}`
                    }
                ;
                msgs.push(msg);
                this.setState({msgs, pageIsLoading: false});
            }).then(() => {
            this.loadData()
        })
    }

    tallyTotals() {
        let users = this.state.userList || [];
        let tempConfig = this.state.config;
        let numDays = moment(new Date()).subtract(this.state.duration, 'hours');
        let theLead = 0;
        let theLeader = '';
        users.map((_, index) => {
            const presses = this.state.kettlebellPresses || [];
            users[index].totalReps = users[index].totalKgs = 0;

            // initialize our dataset
            tempConfig.datasets[index] = {
                label: 'Competitor',
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
                    if (moment(presses[set].createdTime).isBetween(numDays, new Date())) {
                        let prevTotalKg = users[index].totalKgs || 0;
                        let prevTotalReps = users[index].totalReps || 0;
                        users[index].totalKgs = parseInt((presses[set].repetitions * presses[set].weight) + prevTotalKg);
                        users[index].totalReps = parseInt(presses[set].repetitions + prevTotalReps);

                        tempConfig.datasets[index].label = users[index].name;

                        tempConfig.datasets[index].data.push({
                            x: momentTZ(presses[set].createdTime),
                            y: parseInt((presses[set].repetitions * presses[set].weight) + prevTotalKg)
                        });
                        if (users[index].totalKgs > theLead) {
                            console.log("The lead has been taken. ");
                            console.log(theLead + "beaten by " + users[index].totalKgs);
                            theLead = users[index].totalKgs;
                            theLeader = users[index].id;
                        }
                    }
                }
            }
            this.setState({latest: presses[presses.length - 1] || 0, theLead, theLeader, leaderUpdated: true});
        });
        users.sort((a, b) => (a.totalKgs < b.totalKgs) ? 1 : -1);
        //TODO fix this up. It doesn't handle empty userList's
        if (!this.state.userID) {
            this.setState({userID: 1});
        }
        this.setState({userList: users, config: tempConfig});
    }

    componentDidMount() {
        // runs a chain. getMyID then getUsers, loadData and then tallyTotals
        this.getMyID();
    }

    render() {
        const users = this.state.userList || [];
        const userLookupTable = this.state.userLookupTable || [];
        const latestUUID = this.state.latest.uuid || [];
        const kbs = [16, 24, 32, 48];
        const repRange = [5, 10, 20, 50, 100, 200];
        const nameOfDuration = ['1 hour', '3 hours', '6 hours', '12 hours', '24 hours', '2 days', '3 days', '14 days', '31 days'];
        const durationDays = [1, 3, 6, 12, 24, 48, 72, 336, 744];
        const latestAmount = parseInt(this.state.latest.repetitions * this.state.latest.weight) || 0;
        const latestTime = moment(this.state.latest.createdTime).fromNow() || '';
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
        const duration = durationDays.map((_, index) => {
            return (
                <option key={index} value={durationDays[index]}>{nameOfDuration[index]}</option>
            )
        });
        const kettlebellsTable = users.map((_, index) => {
            let neededToLead = '';
            const theLead = this.state.theLead;
            const theLeader = this.state.theLeader;
            const kettlebell = this.state.kettlebell;
            if (theLeader !== users[index].id) {
                const neededReps = parseInt((theLead - users[index].totalKgs) / kettlebell) + 1;
                neededToLead = " - " + neededReps + '  reps need to take the lead';
            }
            return (
                <tr key={uuidv1()}>
                    <td>{index + 1}</td>
                    <td>{users[index].name} {neededToLead}</td>
                    <td>{users[index].totalReps} </td>
                    <td>{users[index].totalKgs} </td>
                </tr>
            )
        });

        const latestResult = (
            this.state.latest &&
            <Row><Alert>{'Latest: '} {latestAmount} {'kg'} {latestTime} {' by'} {this.state.userLookupTable[latestUUID].name}</Alert>
            </Row>
        );
        const messages = this.state.msgs;
        const msgs = messages.map((_, index) => {
            return (
                <Toast key={index + new Date()} show={true} onClose={() => this.closeToast(index)} autohide>
                    <Toast.Header>
                        <img style={{width: 20, height: 20}} src="favicon.png" className="rounded mr-2" alt=""/>
                        <strong className="mr-auto">{messages[index].name}</strong>
                        <small>{messages[index].time.fromNow()}</small>
                    </Toast.Header>
                    <Toast.Body>{messages[index].body}</Toast.Body>
                </Toast>
            )
        });

        return (
            <Container fluid={true}>
                <div style={{
                    position: 'fixed',
                    top: 1,
                    right: 1,
                    zIndex: 100,
                }}>
                    {msgs}
                </div>
                <Navbar bg="dark" variant="dark">
                    <Navbar.Brand href="#home">
                        <img
                            alt=""
                            src="/static/favicon.png"
                            width="30"
                            height="30"
                            className="d-inline-block align-top"
                        />
                        {' Kettlebell Competition'}
                    </Navbar.Brand>
                </Navbar>
                {this.state.mockup && <Alert variant={'danger'}>{'Warning running in mockup mode.'}</Alert>}

                <Card>
                    <Card.Title><h3>Ranking</h3></Card.Title>
                    <Card.Body>
                        <Row>

                            <Col>
                                <Line
                                    ref="chart"
                                    data={this.state.config}
                                    height={500}
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
                            <Col xs={4}>
                                <Form>
                                    <Form.Group controlId="kbForm.duration">
                                        <Form.Control
                                            value={this.state.duration}
                                            onChange={this.handleDuration} as="select">
                                            {duration}
                                        </Form.Control>
                                    </Form.Group>
                                </Form>
                            </Col>
                            <Col xs={2}>
                                <Button variant={'primary'}
                                        disabled={(this.state.reloading) || !this.state.userID}
                                        onClick={!(this.state.reloading) ? this.handleReload : null}>
                                    {(this.state.loading) ? <Spinner
                                        as="span"
                                        animation="grow"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                    /> : ''}
                                    {'Reload'}
                                </Button>
                            </Col>
                        </Row>
                        {latestResult}
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
                        {!this.state.myID &&
                        <Alert variant="danger">
                            <a href={'/login'}>'Please login to your account'</a>
                        </Alert>
                        }
                        {this.state.myID &&
                        <Row>
                            <Col md={4}>
                                <Form>
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
                        }
                    </Card.Body>
                </Card>
            </Container>
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

export default withCookies(App);
