import React, { Component } from 'react';


class FunFacts extends Component {
    render() {
        return (
            <div className="fun-facts-area ptb-100">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-3 col-sm-6">
                            <>
                                <div className="single-fun-fact">
                                    <h3>
                                        820
                                        <span className="sign-icon">+</span>
                                    </h3>
                                    <p>Data Analytics</p>
                                </div>
                            </>
                        </div>

                        <div className="col-lg-3 col-sm-6">
                            <>
                                <div className="single-fun-fact">
                                    <h3>
                                        150
                                        <span className="sign-icon">+</span>
                                    </h3>
                                    <p>Data Management</p>
                                </div>
                            </>
                        </div>

                        <div className="col-lg-3 col-sm-6">
                            <>
                                <div className="single-fun-fact">
                                    <h3>
                                        20
                                        <span className="sign-icon">+</span>
                                    </h3>
                                    <p>Managed  Analytics</p>
                                </div>
                            </>
                        </div>

                        <div className="col-lg-3 col-sm-6">
                            <>
                                <div className="single-fun-fact">
                                    <h3>
                                        120
                                        <span className="sign-icon">+</span>
                                    </h3>
                                    <p>Big Data</p>
                                </div>
                            </>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default FunFacts;
